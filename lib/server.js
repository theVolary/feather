//this file should only be run on the server, so no client-safety issues to worry about

var sys = require("sys"),
    fs = require("fs"),
    http = require("http"),
    Connect = require("connect"),
    events = require("./node-core-enhancements/events/events"),
    indexer = require("./file-indexer");
    
/**
 * Server-side Framework init function
 */
exports.init = function(options) {
  //defaults
  options = options || {};
  options.jojoRoot = options.jojoRoot || "./";
  options.appRoot = options.appRoot || __dirname;
  options.publicRoot = options.publicRoot || options.appRoot + "/public";
  options.port = options.port || 8080;
  options.states = options.states || {};
  options.states.ready = options.states.ready || {
    request: function(fsm, args) {
      var res = args.eventArgs.response;
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('jojo was started with no custom request handler.\n');
    }  
  };
  
  jojo.appOptions = options;
  
  //base files
  // Do we need this anymore?  We removed node-htmlparser
  //require.paths.unshift(__dirname + "/node-htmlparser"); //required for DOM manipulation on the server
  var files = [
    {path: options.jojoRoot + "lang"}, 
    {path: options.jojoRoot + "event"},
    {path: options.jojoRoot + "fsm"},
    options.enableLogging ? {path: options.jojoRoot + "logging"} : null,
    {path: options.jojoRoot + "widget"},
    {path: options.jojoRoot + "widget.server"},
    {path: options.jojoRoot + "router"}
  ];
  
  //custom files requested by whoever called init()
  if (options.files) {
    for (var i = 0, l = options.files.length; i < l; i++) {
      files.push(options.files[i]);
    }
  }
  
  //load away
  var _interface;
  for (var i = 0, l = files.length; i < l; i++) {
    if (files[i]) {
      _interface = require(files[i].path);
      if (typeof _interface.init === "function") {
        _interface.init(options);
      }
    }
  }
  
  //system middleware & custom middleware (via connect)
  var emptyMiddleware = function(req, res, next) {
    next();
  };
  var middleware = [
    function(req, res, next) {
      //easy access to current request and response
      sys.puts('in middleware')
      jojo.request = req;
      jojo.response = res;
      jojo.stateMachine.fire("request", {request: req, response: res, next: next});
    },
    options.enableLogging ? jojo.logging.connectLogger() : emptyMiddleware,
    jojo.routers[0].router,
    Connect.static(options.publicRoot),
    //if we get this far, assume a static resource could not be found and send the custom 404 file
    function(req, res, next) {
      req.url = "/404.html";
      next();
    },
    Connect.static(options.publicRoot), //TODO: maybe combine this with the handler above for a single "404Provider"
    //final resource handler before the error handler... if no custom 404.html file is present in this app,
    //write a basic message...
    //TODO: make this also be server-wide configurable
    function(req, res) {
      //res.writeHead(200, {'Content-Type': 'text/plain'});
      //res.end('404 - The file you have requested could not be found. (default)');
     throw new Error("404 - The file you have requested could not be found.");
    },
    //per-request error handler
    Connect.errorHandler({showStack: options.debug})
  ];
    
  //when the framework has finished initializing, start up the http server
  jojo.stateMachine.onceState("loadingComplete", function() {
    sys.puts("creating Connect server");
    //create the underlying Connect server instance
    sys.puts("Connect.createServer is a " + Connect.createServer);
    sys.puts("Apply is " + Connect.createServer.apply);
    sys.puts("This is " + this);
    debugger;
    jojo.server = Connect.apply(this, middleware);
        
    sys.puts("wiring routers");
    //wire up the routers
    for (var i = 0, l = jojo.routers.length; i < l; i++) {
      jojo.server.use(jojo.routers[i].path, jojo.routers[i].router);
    }
    
    sys.puts("trying to listen on port " + options.port);
    //start listening for requests
    jojo.server.listen(options.port);
    
    //logging
    sys.puts("jojo server listening on port: " + options.port);
    
    //now finally make the move to the ready state
    jojo.stateMachine.fire("ready");
  });
    
  //index the application's files and directories
  indexer.index(jojo, options, function() {
    sys.puts("jojo.appDirectories = ");
    sys.puts(JSON.stringify(jojo.appDirectories));
    sys.puts("jojo.appFiles = ");
    sys.puts(JSON.stringify(jojo.appFiles));
    sys.puts("jojo.jojoFiles = ");
    sys.puts(JSON.stringify(jojo.jojoFiles));
    sys.puts("STARTING UP...");
    if (jojo.appOptions.enableLogging && jojo.appOptions.logFilePath) {
      fs.open(jojo.appOptions.appRoot + "/" + jojo.appOptions.logFilePath, "a", 0666, function(err, fd) {
        if (err) throw err;
        jojo.logFile = fd;
        process.on("exit", function() {
          sys.puts("closing logFile");
          fs.close(fd);
        });
        //all async operations have completed and indexing should be complete, now we can put the framework in a ready state
        jojo.stateMachine.fire("loadingComplete");
      });
    } else {
      //all async operations have completed and indexing should be complete, now we can put the framework in a ready state
      jojo.stateMachine.fire("loadingComplete");
    }
    
  });
};