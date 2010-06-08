//this file should only be run on the server, so no client-safety issues to worry about

var sys = require("sys");
var http = require("http");

/**
 * Server-side Framework init function
 */
exports.init = function(options) {
    //defaults
    options = options || {};
    options.port = options.port || 8080;
    
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
    for (var i = 0, l = files.length; i < l; i++) {
        require(files[i].path);
    }
    
    //when the framework has finished initializing, start up the server
    jojo.stateMachine.onceState("ready", function() {
        jojo.server = http.createServer(function (req, res) {
          setTimeout(function () {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Hello World\n');
          }, 10);
        });
        jojo.server.listen(options.port);
        sys.puts("jojo server listening on port: " + options.port);
    });
    
    //attempt to put jojo's main state machine in ready state
    jojo.stateMachine.fire("loadingComplete");
};
