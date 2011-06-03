//this file should only be run on the server, so no client-safety issues to worry about
var sys = require("sys"),
    fs = require("fs"),
    http = require("http"),
    Connect = require("connect"),
    EventPublisher = require("./event-publisher"),
    FSM = require("./fsm"),
    Semaphore = require("./semaphore"),
    indexer = require("./file-indexer"),
    router = require("./router"),
    parser = require("./parser"),
    fileWatcher = require("./filewatcher");    

//get middleware
var middleware = require("./middleware").middleware;

exports.init = function(options, cb) {
  var fsm = new FSM({
    states: {
      initial: {
        stateStartup: function() {
          // - index the application's files and directories,
          // - pre-parse all feather.html files
          // - move the stateMachine to the next state
          var sem = new Semaphore(function() {
            fsm.fire("parsingComplete");
          });
          indexer.index(options, function(err, indexedFiles) {
            if (err) fsm.fire("error", err); else {
              for (var path in indexedFiles.featherFiles) {
                (function(_path) {
                  sem.increment();
                  //guarantee all files get counted in semaphore
                  process.nextTick(function() {
                    parser.parseFile({
                      path: _path, 
                      request: {page: _path.replace(/.*\/([^\/]*)$/, "$1")} //need a dummy request object for parser since there is no real request at this point
                    }, function(err, render) {
                        if (err) fsm.fire("error", err); else {
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
                })(path);
              } //end for
            } //end if       
          }); //end index
        }, //end initial.stateStartup
        parsingComplete: function() {
          return fsm.states.createServer;
        }
      }, //end initial state
      createServer: {
        stateStartup: function() {
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

          //wire up the router(s)
          router.init(options, function(err, routers) {
            if (err) fsm.fire("error", err); else {
              for (var i = 0, l = routers.length; i < l; i++) {
                server.use(routers[i].path, routers[i].router);
              }

              //start listening
              server.listen(options.port);

              fsm.fire("complete", server);
            }
          });
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
          cb(err);
          fsm.dispose();
        }
      }
    }
  }); 
};