//this file should only be run on the server, so no client-safety issues to worry about

var sys = require("sys");
var http = require("http");

/**
 * Server-side Framework init function
 */
exports.init = function(jojo, options) {
    //defaults
    options = options || {};
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
        {path: "./dom"},
        {path: "./lang"}, 
        {path: "./event"},
        {path: "./fsm"},
        {path: "./widget"}
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
    
    //when the framework has finished initializing, start up the server
    jojo.stateMachine.onceState("ready", function() {
        jojo.server = http.createServer(function(req, res) {
            jojo.stateMachine.fire("request", {request: req, response: res});
        });
        jojo.server.listen(options.port);
        sys.puts("jojo server listening on port: " + options.port);
    });
    
    //attempt to put jojo's main state machine in ready state
    jojo.stateMachine.fire("loadingComplete");
};
