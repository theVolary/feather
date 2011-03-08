//this file should only be run on the server, so no client-safety issues to worry about

var sys = require("sys"),
    fs = require("fs"),
    http = require("http"),
    Connect = require("connect"),
    events = require("./node-core-enhancements/events/events"),
    indexer = require("./file-indexer"),
    io = require("socket.io");
    
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
  
  //get middleware
  var middleware = require("./middleware").middleware;
    
  //when the framework has finished initializing, start up the http server
  jojo.stateMachine.onceState("loadingComplete", function() {
    sys.puts("creating Connect server");
    //create the underlying Connect server instance
    jojo.server = Connect.apply(this, middleware);
        
    sys.puts("wiring routers");
    //wire up the routers
    for (var i = 0, l = jojo.routers.length; i < l; i++) {
      jojo.server.use(jojo.routers[i].path, jojo.routers[i].router);
    }
    
    sys.puts("trying to listen on port " + options.port);
    
    //wrap the server in socket.io (for rpc) and start listening for requests
    //TODO: figure out socket-io w/ Connect (https://github.com/bnoguchi/Socket.IO-connect)
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