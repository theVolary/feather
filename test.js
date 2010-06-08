var sys = require("sys");
require("./lib/core"); //adds jojo to the global namespace
require("./lib/server").init({
    port: 8089
});

jojo.on("test", function() {
   sys.puts("events are firing..."); 
});
jojo.fire("test");
