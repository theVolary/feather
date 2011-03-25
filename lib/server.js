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
  options.socketPort = options.socketPort || 8081;
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
    {path: options.jojoRoot + "jojologger"},
    {path: options.jojoRoot + "widget"},
    {path: options.jojoRoot + "widget.server"},
    {path: options.jojoRoot + "router"},
    {path: options.jojoRoot + "data"}
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
    //create the underlying Connect server instance
    jojo.server = Connect.apply(this, middleware);
        
    //wire up the routers
    for (var i = 0, l = jojo.routers.length; i < l; i++) {
      jojo.server.use(jojo.routers[i].path, jojo.routers[i].router);
    }

    //start listening
    jojo.server.listen(options.port);
    
    //start up the socket server
    require("./server.socket").init(options);
    
    //logging
    jojo.logger.info({message:"jojo server listening on port: " + options.port, category:"jojo.srvr"});
    
    //now finally make the move to the ready state
    jojo.stateMachine.fire("ready");
  });
    
  //index the application's files and directories
  indexer.index(jojo, options, function() {
    /*sys.puts("jojo.appDirectories = ");
    sys.puts(JSON.stringify(jojo.appDirectories));
    sys.puts("jojo.appFiles = ");
    sys.puts(JSON.stringify(jojo.appFiles));
    sys.puts("jojo.jojoFiles = ");
    sys.puts(JSON.stringify(jojo.jojoFiles));*/
    //sys.puts("STARTING UP...");
    jojo.stateMachine.fire("loadingComplete");
    /*
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
    }*/
    
  });
};