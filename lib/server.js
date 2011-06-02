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
    parser = require("./parser");    

//get middleware
var middleware = require("./middleware").middleware;

//pre load additional server files (pre-loading required for the pre-parsing done after indexing below


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
          indexer.index(options, function(err, result) {
            if (err) fsm.fire("error", err) else {
              for (var path in result.featherFiles) {
                (function(_path) {
                  sem.increment();
                  //guarantee all files get counted in semaphore
                  process.nextTick(function() {
                    feather.parser.parseFile({
                      path: _path, 
                      request: {page: _path.replace(/.*\/([^\/]*)$/, "$1")} //need a dummy request object for parser since there is no real request at this point
                    }, function(err, render) {
                        if (err) fsm.fire("error", err) else {
                          result.featherFiles[_path].render = render;
                          //now, if this file changes on disk, invalidate and remove the compiled renderer until the next request
                          feather.event.eventDispatcher.once("filechange:" + _path, function(args) {
                            if (args.prev.mtime.getTime() != args.curr.mtime.getTime()) {
                              feather.logger.info("feather file " + path + " changed! " + args.prev.mtime.getTime() + ' / ' + args.curr.mtime.getTime());
                              feather.featherFiles[_path].render = null;
                            }
                          });
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
          
        }
      },
      error: {
        stateStartup: function(err) {
          cb(err);
        }
      }
    }
  });

  

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
    e = err;
    if (err) cb(err) else {
      for (var i = 0, l = routers.length; i < l; i++) {
        server.use(routers[i].path, routers[i].router);
      }
    }
  });
  
  if (!e) {  
    //start listening
    server.listen(options.port);
    
    cb(null, server);
  }
};