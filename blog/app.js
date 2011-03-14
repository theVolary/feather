var sys = require("sys"),
    Connect = require("connect");

//bootstrap jojo (default context object is 'global')
require("../lib/core").bootstrap(/*some custom context object can go here*/);

//TODO: These states have some core functionality which should be moved in the framework
//TODO: make generic configuration file loader for this stuff
jojo.init({
    debug: true,
    jojoRoot: "../lib/",
    appRoot: __dirname,
    enableLogging: true,
    logFilePath: "blog.log",
    middleware: [
        
    ],
    states: {
        ready: {
            stateStartup: function(fsm, args) {
                if (jojo.appOptions.enableLogging && !jojo.logger) {
                    jojo.logger = new jojo.logging.logger();
                }
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
                
                //basic benchmarking
                req.startTime = (new Date()).getTime();
                
                if (jojo.logger) {
                    jojo.logger.log("-------------------------------------------------------------------------");
                    jojo.logger.log("processing request: " + req.url);
                }  
                                
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
            if (jojo.logger) {
                jojo.logger.log("request took " + diff + " milliseconds");
                jojo.logger.log("-------------------------------------------------------------------------");
                jojo.logger.flush();
            }
          }
        }
    }
});
