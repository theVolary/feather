//this file should only be run on the server, so no client-safety issues to worry about
var sys = require("sys"),
    fs = require("fs"),
    http = require("http"),
    Connect = require("connect"),
    events = require("./node-core-enhancements/events/events"),
    indexer = require("./file-indexer");
    
/*
 * Server-side Framework init function
 */
exports.init = function(options) {
  //defaults
  if (options && options.useEnv) {
    console.info("Using " + options.useEnv + " environment");
    var newOptions = { environment:options.useEnv };
    for (var p in options) {
      if (p !== 'environments' && p !== 'useEnv') {
        newOptions[p] = options[p];
      }
    }
    options = feather.recursiveExtend(options, options.environments[options.useEnv]);
  }
  options = options || {};
  options.featherRoot = options.featherRoot || "./";
  options.appRoot = options.appRoot || __dirname;
  options.publicRoot = options.publicRoot || options.appRoot + "/public";
  options.port = options.port || 8080;
  options.socketPort = options.socketPort || 8081;
  options.states = options.states || {};
  options.states.ready = options.states.ready || {
    request: function(fsm, args) {
      var res = args.eventArgs.response;
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('feather was started with no custom request handler.\n');
    }  
  };
  
  feather.appOptions = options;
  
  global._ = require("./underscore")._;

  //base files
  var core_files = [
    {path: "./lang"}, 
    {path: "./event"},
    {path: "./fsm"},
    {path: "./logger"}    
  ];

  
  //load away
  var _interface;
  for (var i = 0, l = core_files.length; i < l; i++) {
    if (core_files[i]) {
      _interface = require(core_files[i].path);
      if (typeof _interface.init === "function") {
        _interface.init(options);
      }
    }
  }
    
  /**
   * A global dom singleton (mainly for $.tmpl usage in logger and the like)
   * @name feather.dom
   */
  feather.dom = new (require("./dom").DomResource)({
    onceState: {
      ready: function() {
        var more_files = [
          {path: "./widget"},
          {path: "./widget.server"},
          {path: "./parser"},
          {path: "./router"},
          {path: "./data"}
        ];
        //custom files requested by whoever called init()
        if (options.files) {
          for (var i = 0, l = options.files.length; i < l; i++) {
            more_files.push(options.files[i]);
          }
        }
        
        //load away
        var _interface;
        for (var i = 0, l = more_files.length; i < l; i++) {
          if (more_files[i]) {
            _interface = require(more_files[i].path);
            if (typeof _interface.init === "function") {
              _interface.init(options);
            }
          }
        }
        //get middleware
        var middleware = require("./middleware").middleware;
        
        //pre load additional server files (pre-loading required for the pre-parsing done after indexing below
        var serverDotSocket = require("./server.socket");
        var authServer = require("./auth-server");
  
        //when the framework has finished initializing, start up the http server
        feather.stateMachine.onceState("loadingComplete", function() {
          //create the underlying Connect server instance
          feather.server = Connect.apply(this, middleware);
          feather.server.on("close", function(errno) {
            feather.logger.info({message:"feather server shutting down.", category:'feather.srvr', immediately:true});
          });
          
          // configure session path ignores
          if (feather.appOptions.session.ignorePaths && feather.server.session) {
            var si = feather.appOptions.session.ignorePaths.length-1;
            while (si >= 0) {
              feather.server.session.ignore.push(feather.appOptions.session.ignorePaths[si]);
              si -= 1;
            }
          }
              
          //wire up the routers
          for (var i = 0, l = feather.routers.length; i < l; i++) {
            feather.server.use(feather.routers[i].path, feather.routers[i].router);
          }
      
          //start listening
          feather.server.listen(options.port);
          
          //start up the socket server
          serverDotSocket.init(options);
          authServer.init(options);
          
          //logging
          feather.logger.info({message:"feather server listening on port: " + options.port + ".  Welcome to feather!", category:"feather.srvr"});

          feather.stateMachine.fire("startup");

          //now finally make the move to the ready state
          feather.stateMachine.fire("ready");
        });
          
        //index the application's files and directories, and then move the stateMachine to the next state
        indexer.index(feather, options, function() {
          //pre-parse all feather.html files before indicating loading complete and starting the server
          var sem = new feather.lang.semaphore(function() {
            feather.stateMachine.fire("loadingComplete"); 
          });
          for (var path in feather.featherFiles) {
            (function(_path) {
              sem.increment();
              //guarantee all files get counted in semaphore
              process.nextTick(function() {
                feather.parser.parseFile(_path, {
                  request: {page: _path.replace(/.*\/([^\/]*)$/, "$1")}, //need a dummy request object for parser since there is no real request at this point
                  callback: function(render) {
                    feather.featherFiles[_path].render = render;
                    //now, if this file changes on disk, invalidate and remove the compiled renderer until the next request
                    feather.event.eventDispatcher.once("filechange:" + _path, function(args) {
                      if (args.prev.mtime.getTime() != args.curr.mtime.getTime()) {
                        feather.logger.info("feather file " + path + " changed! " + args.prev.mtime.getTime() + ' / ' + args.curr.mtime.getTime());
                        feather.featherFiles[_path].render = null;
                      }
                    });
                    sem.execute();
                  }
                });
              });              
            })(path);
          }             
        });
      }
    }
  });
};