var sys = require("sys"),
    Connect = require("../lib/connect/lib/connect/index"),
    jojo = require("../lib/core").jojo;

//TODO: These states have some core functionality which should be moved in the framework
//TODO: make generic configuration file loader for this stuff
jojo.init({
    port: 8088,
    debug: true,
    jojoRoot: "../lib/",
    appRoot: __dirname,
    logFilePath: "test.log",
    middleware: [
        
    ],
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
                               
                var req = args.request;
                var res = args.response;
                
                //per-request logging
                req.logger = new jojo.logging.logger();
                
                //basic benchmarking
                req.startTime = (new Date()).getTime();
                
                req.logger.log("-------------------------------------------------------------------------");
                req.logger.log("processing request: " + req.url); 
                                
                req.on("end", function() {
                  fsm.fire("endRequest", {request: req, response: res});
                });
                
                //start running through the middleware
                args.next();
                
                //go back and wait for the next request
                return fsm.states.ready;               
            }
        },
        global: {
          endRequest: function(fsm, args) {
            //done processing the request, we can go wait for a new one now
            //simple per-request benchmarking
            var req = args.request;
            var newTick = (new Date()).getTime();
            var diff = newTick - req.startTime;
            req.logger.log("request took " + diff + " milliseconds");
            req.logger.log("-------------------------------------------------------------------------");
            req.logger.dispose();
          }
        }
    }
});