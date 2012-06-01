var tls             = require("tls"),
    fs              = require("fs"),
    http            = require("http"),
    https           = require("https"),
    Connect         = require("connect"),
    EventPublisher  = require("./event-publisher"),
    FSM             = require("./fsm"),
    Semaphore       = require("./semaphore"),
    indexer         = require("./file-indexer"),
    parser          = require("./parser"),
    fileWatcher     = require("./filewatcher"),
    middleware      = require("./middleware"),
    cache           = require("./simple-cache"),
    _               = require("underscore")._,
    restProxy       = require("./restProxy"),
    connectRouter   = require("./router_connect");

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
            appOptions: options,
            files: indexedFiles.restFiles
          }, function(err, restProxyInfo) {
            if (err) cb(err); else {
              fsm.fire("parseFeatherFiles", indexedFiles, restProxyInfo);
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
                  if (err) throw new Error(JSON.stringify(err)); else {
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
          middleware.getMiddleware(options, function(err, _middleware, _rest) {
            if (err) fsm.fire("error", err); else {
              var mirror = null,
                sem = 0,
                tlsOptions;

              //stash the rest interface
              cache.setItem("feather-rest", _rest);

              //defer final server setup until SSL/mirroring is sorted out below
              var completeServerSetup = function() {
                //create the underlying Connect server instance
                var server = Connect();
                _.each(_middleware, function(ware) {
                  server.use(ware);
                });
                
                // configure session path ignores
                if (options.connect.session.ignorePaths && server.session) {
                  var si = options.connect.session.ignorePaths.length-1;
                  while (si >= 0) {
                    server.session.ignore.push(options.connect.session.ignorePaths[si]);
                    si -= 1;
                  }
                } 

                //start listening
                var port = options.port;
                if (options.ssl && options.ssl.enabled && options.ssl.port) port = options.ssl.port;
                
                if (options.ssl && options.ssl.enabled) {
                  server.httpServer = https.createServer(tlsOptions, server).listen(port);
                } else {
                  server.httpServer = http.createServer(server).listen(port);
                }
                

                if (options.daemon.runAsDaemon == true && options.daemon.runAsUser) {
                  process.setuid(options.daemon.runAsUser);
                  
                  if (options.daemon.runAsDaemon == true && options.daemon.runAsGroup) {
                    process.setgid(options.daemon.runAsGroup);
                  }
                }

                fsm.fire("complete", server, mirror);
              };

              //use ssl?
              if (options.ssl && options.ssl.enabled) {
                if (options.ssl.routes && (!options.ssl.port || options.ssl.port == options.port)) throw new Error("When explicit SSL routes are defined, you must also specify a value for ssl.port which must be different from the non-SSL port.");
                tlsOptions = {
                  key: fs.readFileSync(options.ssl.key),
                  cert: fs.readFileSync(options.ssl.cert)
                };
                if (options.ssl.ca) {
                  tlsOptions.ca = [];
                  _.each(options.ssl.ca, function(ca) {
                    var certs = fs.readFileSync(ca);
                    tlsOptions.ca.push(certs);
                  });
                }
                _middleware.unshift(tlsOptions);

                if (options.ssl.useRedirectServer && !options.ssl.routes) {
                  //ssl is configured as "strict, always on" - i.e. no explicit ssl routes are defined,
                  //therefore, the 'mirror' server on the redirect port need only be a 'throw-away' shim that redirects all requests to SSL
                  var redirectServer = Connect(
                    function(req, res, next) {
                      //do the redirect
                      res.statusCode = 302;
                      var host = options.host;
                      //if ssl port is non-standard (443), make sure it gets included in the redirect url
                      host += options.ssl.port === 443 ? "" : ":" + options.ssl.port;
                      res.setHeader("Location", "https://" + host + req.url);
                      res.end();
                    }
                  );
                  redirectServer.listen(options.ssl.redirectServerPort);
                } else if (options.ssl.routes) {
                  //ssl is defined as only _enforced_ for a subset of routes (all routes MAY still use https, but these routes MUST use it),
                  //therefore we must create a full mirror server that has logic to force-redirect to ssl for specific routes
                  
                  sem++; //indicate final server setup needs to be deferred

                  //get another copy of the middleware stack for the mirror
                  middleware.getMiddleware(options, function(err, __middleware, __rest) {
                    //stash the mirror's rest interface
                    cache.setItem("feather-rest-mirror", __rest);

                    //add the SSL route enforcement middleware module at the top of the new stack
                    __middleware.unshift(connectRouter(function(app) {
                      _.each(options.ssl.routes, function(route) {
                        _.each(connectRouter.methods, function(verb) {
                          (app[verb])(new RegExp(route), function(req, res, next) {
                            //do the redirect
                            res.statusCode = 302;
                            var host = options.host;
                            //if ssl port is non-standard (443), make sure it gets included in the redirect url
                            host += options.ssl.port === 443 ? "" : ":" + options.ssl.port;
                            res.setHeader("Location", "https://" + host + req.url);
                            res.end();
                          });
                        });
                      });                                         
                    }));

                    //spin up mirror and complete server setup
                    mirror = Connect();
                    _.each(__middleware, function(ware) {
                      mirror.use(ware);
                    });
                    mirror.listen(options.port);
                    completeServerSetup();  
                  });
                }
              }
              
              if (sem === 0) completeServerSetup();
            }
          });
        },
        complete: function() {
          return this.states.complete;
        }
      }, //end createServer state
      complete: {
        stateStartup: function(server, mirror) {
          cb(null, server, mirror);
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