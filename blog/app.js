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
    data: {
      securitydb: {
        /*hostUrl: 'http://localhost',
      	dbName: 'auth',
      	dbPort: 5984,
      	cache: true,
      	raw: false,
      	auth: { username:"", password:"" },
      	useAuth: false,
      	secure: false*/
      },
      metadb: {
        // ditto
      },
      appdb: {
        hostUrl: 'http://localhost',
        dbName:'jojoblog',
        auth: { username:'jojoadmin', password:'password'}
      }
      
    },
    logging: {
      enabled: true,
      templates: [
        {id:'some.template', template:'This is my message w/ var: ${var}'}
      ]
    },
    middleware: [
        
    ],
    states: {
        ready: {
            stateStartup: function(fsm, args) {
              jojo.logger.addTemplate('separator', "-------------------------------------------------------------------------");
              jojo.logger.trace({message:"app is currently waiting on requests", category:jojo.logger.categories.http});
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
                
                jojo.logger.trace({templateId:'separator', category:jojo.logger.categories.http});
                jojo.logger.trace({message:"processing request: ${url}", replacements:req, category:jojo.logger.categories.http});
                                
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
                jojo.logger.trace({message:"request took ${ms} milliseconds", replacements:{ms:diff}, category:jojo.logger.categories.http});
                jojo.logger.trace({templateId:'separator'});
//                jojo.logger.flush();
            }
          }
        }
    }
});
