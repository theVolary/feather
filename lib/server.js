//this file should only be run on the server, so no client-safety issues to worry about

var sys = require("sys"),
    http = require("http"),
    Connect = require("connect");

/**
 * Server-side Framework init function
 */
exports.init = function(jojo, options) {
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
    
    //base files
    require.paths.unshift(__dirname + "/node-htmlparser"); //required for DOM manipulation on the server
    var files = [
        {path: options.jojoRoot + "router"},
        {path: options.jojoRoot + "dom"},
        {path: options.jojoRoot + "lang"}, 
        {path: options.jojoRoot + "event"},
        {path: options.jojoRoot + "fsm"},
        {path: options.jojoRoot + "widget"}
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
        _interface = require(files[i].path);
        if (typeof _interface.init === "function") {
            _interface.init(jojo, options);
        }
    }
    
    //system middleware & custom middleware (via connect)
    var middleware = [
        function(req, res, next) {
            jojo.stateMachine.fire("request", {request: req, response: res, next: next});
        },
        Connect.logger(),
        jojo.routers[0].router,
        Connect.staticProvider(options.publicRoot),
        //if we get this far, assume a static resource could not be found and send the custom 404 file
        function(req, res, next) {
            req.url = "/404.html";
            next();
        },
        Connect.staticProvider(options.publicRoot),
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
    jojo.stateMachine.onceState("ready", function() {
        //create the underlying Connect server instance
        jojo.server = Connect.createServer.apply(this, middleware);
        
        //wire up the routers
        for (var i = 0, l = jojo.routers.length; i < l; i++) {
            jojo.server.use(jojo.routers[i].path, jojo.routers[i].router);
        }
        
        //start listening for requests
        jojo.server.listen(options.port);
        
        //logging
        sys.puts("jojo server listening on port: " + options.port);
    });
    
    //attempt to put jojo's main state machine in ready state
    jojo.stateMachine.fire("loadingComplete");
};
