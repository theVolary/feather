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
  if (options && options.useEnv) {
    console.info("Using " + options.useEnv + " environment");
    var newOptions = { environment:options.useEnv };
    for (var p in options) {
      if (p !== 'environments' && p !== 'useEnv') {
        newOptions[p] = options[p];
      }
    }
    for (p in options.environments[options.useEnv]) {
      newOptions[p] = options.environments[options.useEnv][p];
    }
    options = newOptions;
  }
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
  require.paths.unshift(__dirname);
  require.paths.unshift([jojo.appOptions.appRoot, 'lib'].join('/'));

  //base files
  var files = [
    {path: "lang"}, 
    {path: "event"},
    {path: "fsm"},
    {path: "logger"},
    {path: "widget"},
    {path: "widget.server"},
    {path: "router"},
    {path: "data"}
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
  var middleware = require("middleware").middleware;
  
  //create a global dom singleton (mainly for $.tmpl usage in logger and the like)
  jojo.dom = new (require("dom").DomResource)({
    onceState: {
      ready: function() {
        //when the framework has finished initializing, start up the http server
        jojo.stateMachine.onceState("loadingComplete", function() {
          //create the underlying Connect server instance
          jojo.server = Connect.apply(this, middleware);
          
          // configure session path ignores
          if (jojo.appOptions.session.ignorePaths && jojo.server.session) {
            var si = jojo.appOptions.session.ignorePaths.length-1;
            while (si >= 0) {
              jojo.server.session.ignore.push(jojo.appOptions.session.ignorePaths[si]);
              si -= 1;
            }
          }
              
          //wire up the routers
          for (var i = 0, l = jojo.routers.length; i < l; i++) {
            jojo.server.use(jojo.routers[i].path, jojo.routers[i].router);
          }
      
          //start listening
          jojo.server.listen(options.port);
          
          //start up the socket server
          require("server.socket").init(options);
          require("auth-server").init(options);
          
          //logging
          jojo.logger.info({message:"jojo server listening on port: " + options.port + ".  Welcome to jojo!", category:"jojo.srvr"});
          
          //now finally make the move to the ready state
          jojo.stateMachine.fire("ready");
        });
          
        //index the application's files and directories, and then move the stateMachine to the next state
        indexer.index(jojo, options, function() {
          jojo.stateMachine.fire("loadingComplete");    
        });
      }
    }
  });
};