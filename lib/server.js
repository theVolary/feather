//this file should only be run on the server, so no client-safety issues to worry about

var sys = require("sys");
var http = require("http");

function loadCoreFiles(jojo, files, options) {    
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!file) {
            continue;
        }
        require(file.path);
    }
}

/**
 * Server-side Framework init function
 */
exports.init = function() {
    //defaults
    var options = jojo.appOptions;
    options.port = options.port || 8088;
    
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
        for (var i = 0; i < options.files.length; i++) {
            files.push(options.files[i]);
        }
    }
    
    //load away
    loadCoreFiles(jojo, files, options);
    
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
};
