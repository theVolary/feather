var sys             = require("sys")
    tls             = require("tls"),
    fs              = require("fs"),
    http            = require("http"),
    Connect         = require("connect"),
    EventPublisher  = require("./event-publisher"),
    FSM             = require("./fsm"),
    Semaphore       = require("./semaphore"),
    indexer         = require("./file-indexer"),
    router          = require("./router"),
    parser          = require("./parser"),
    fileWatcher     = require("./filewatcher"),
    middleware      = require("./middleware"),
    cache           = require("./simple-cache"),
    _               = require("underscore")._,
    restProxy       = require("./restProxy");

exports.init = function(options, cb) {

  //use a state machine to package/parse required application resources
  var fsm = new FSM({
    states: {
      initial: {
        stateStartup: function() {
          // - index the application's files and directories          
          indexer.index(options, function(err, indexedFiles) {
            if (err) fsm.fire("error", err); else {
              cache.setItem("feather-files", indexedFiles);

              if (indexedFiles.restFiles && options.rest && options.rest.autoGenerateProxy) {
                fsm.fire("generateRestProxy", indexedFiles);
              } else {
                fsm.fire("parseFeatherFiles", indexedFiles, null);
              }
              
            } 
          }); 
        }, 
        generateRestProxy: function(indexedFiles) {
          restProxy.generateProxy({
            files: indexedFiles.restFiles
          }, function(err, proxyInfo) {
            if (err) cb(err); else {
              fsm.fire("parseFeatherFiles", indexedFiles, proxyInfo);
            }
          });
        },
        parseFeatherFiles: function(indexedFiles, restProxyInfo) {
          // - pre-parse all feather.html files
          // - move the stateMachine to the next state
          var sem = new Semaphore(function() {
            fsm.fire("parsingComplete");
          });
          //parse the .feather.html files in the app
          _.each(_.keys(indexedFiles.featherFiles), function(_path) {
            sem.increment();
            //guarantee all files get counted in semaphore
            process.nextTick(function() {
              parser.parseFile({
                restProxyInfo: restProxyInfo,
                path: _path, 
                request: {page: _path.replace(/.*\/public\/(.*)$/, "$1")} //need a dummy request object for parser since there is no real request at this point
              }, function(err, render) {
                  /* this currently crashes server with non-helpful stacktrace - so crash the server with the proper stacktrace for now
                  if (err) fsm.fire("error", err); else { */
                  if (err) throw JSON.stringify(err); else {
                    indexedFiles.featherFiles[_path].render = render;
                    //now, if this file changes on disk, invalidate and remove the compiled renderer until the next request
                    if (!indexedFiles.featherFiles[_path].watchingFile) { //only wire the watcher once
                      fileWatcher.watchFileMtime(_path, function(args) {
                        indexedFiles.featherFiles[_path].render = null;
                      });
                      indexedFiles.featherFiles[_path].watchingFile = true;
                    }
                    sem.execute();
                  }
              });
            });              
          });
        },
        parsingComplete: function() {
          return fsm.states.createServer;
        }
      }, 
      createServer: {
        stateStartup: function() {
          middleware.getMiddleware(options, function(err, middleware) {
            if (err) fsm.fire("error", err); else {

              //use ssl?
              if (options.ssl && options.ssl.enabled) {
                middleware.unshift({
                  key: fs.readFileSync(options.ssl.key),
                  cert: fs.readFileSync(options.ssl.cert)
                });
                //setup the redirect server
                if (options.ssl.useRedirectServer) {
                  var redirectServer = Connect(
                    function(req, res, next) {
                      //do the redirect
                      res.statusCode = 302;
                      var host = options.host;
                      //if ssl port is non-standard (443), make sure it gets included in the redirect url
                      if (typeof host === "string") {
                        host = host.replace(/(:.*)/, options.port === 443 ? "" : ":" + options.port);
                        res.setHeader("Location", "https://" + host + req.url);
                      } //else: can't do anything with host, this is a wonky client, just respond with an empty body
                      res.end();
                    }
                  );
                  redirectServer.listen(options.ssl.redirectServerPort);
                }
              }

              //create the underlying Connect server instance
              var server = Connect.apply(this, middleware);
              
              // configure session path ignores
              if (options.session.ignorePaths && server.session) {
                var si = options.session.ignorePaths.length-1;
                while (si >= 0) {
                  server.session.ignore.push(options.session.ignorePaths[si]);
                  si -= 1;
                }
              } 

              //start listening
              server.listen(options.port);

              if (options.daemon.runAsDaemon == true && options.daemon.runAsUser) {
                console.log("Setting uid to " + options.daemon.runAsUser);
                process.setuid(options.daemon.runAsUser);
                console.log("Server uid is now " + process.getuid());
              }

              fsm.fire("complete", server);
            }
          });
        },
        complete: function() {
          return this.states.complete;
        }
      }, //end createServer state
      complete: {
        stateStartup: function(server) {
          cb(null, server);
          fsm.dispose();
        }
      },
      error: {
        stateStartup: function(err) {
          console.log(err);
          cb(err);
          fsm.dispose();
        }
      }
    }
  }); 
};