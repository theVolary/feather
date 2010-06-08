var sys = require("sys");
require("./lib/core"); //adds jojo to the global namespace
jojo.init({
    port: 8089
});

jojo.on("test", function() {
   sys.puts("events are firing..."); 
});
jojo.fire("test");

//test EventEmitter scope
var e = new process.EventEmitter({
    on: {
        test: function() {
            sys.puts(this === e);
        }
    } 
});
e.fire("test");
