var sys = require("sys");
var jojo = require("./lib/core").jojo;

var tick;
var idleTimer;

//TODO: refactor this stuff into modules, and do a middle-ware thing to stack request handlers
//TODO: make generic configuration file loader for this stuff
require("./lib/server").init(jojo, {
    port: 8089,
    states: {
        ready: {
            stateStartup: function(fsm, args) {
                sys.puts("app is currently waiting on requests");                
            },
            request: function(fsm, args) {
                //we got a new request, move to the "processingRequest" state
                return fsm.states.processingRequest;
            }
        },
        processingRequest: {
            stateStartup: function(fsm, args) {
                tick = (new Date()).getTime();
                               
                var req = args.request;
                var res = args.response;
                
                sys.puts("processing request: " + req.url); 
                
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.write('Custom Request Handler<br/>\n');
                
                //test what happens when requests take too long
                /*setTimeout(function() {
                    fsm.fire("finishingRequest", args);
                }, 1000);*/
               
                //done processing the request, we can go wait for a new one now
                fsm.fire("endRequest", args);
            },
            endRequest: function(fsm, args) {
                //simple per-request benchmarking
                var newTick = (new Date()).getTime();
                var diff = newTick - tick;
                sys.puts("request took " + diff + " milliseconds");
                return fsm.states.ready;
            }
        }
    }
});