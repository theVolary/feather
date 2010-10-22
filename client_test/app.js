var sys = require("sys"),
    Connect = require("../lib/connect/lib/connect/index");
    
require("../lib/core");

jojo.init({
    port: 8088,
    debug: true,
    jojoRoot: "../lib/",
    enableLogging: true,
    logFilePath: "client_test.log",
    appRoot: __dirname,
    middleware: [
        
    ],
    states: {
        ready: {
            stateStartup: function(fsm, args) {
                if (!jojo.logger) {
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
                
                //start running through the middleware
                args.next();
                
                //go back and wait for the next request
                return fsm.states.ready;               
            }
        },
        global: {
          endRequest: function(fsm, args) {
            
          }
        }
    }
});