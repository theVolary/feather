var sys = require("sys"),
    Connect = require("connect"),
    path = require("path");
    
//bootstrap jojo (default context object is 'global')
require("../lib/core").bootstrap(/*some custom context object can go here*/);

var defaultOptions = {
  // Any property /not/ in the environments block is global to all environments 
  // and is the default.  Each environment may still override.
  debug: false,
  useEnv: 'dev',
  jojoRoot: "../lib/",
  appRoot: __dirname,
  enableLogging: true,
  daemon: {
    runAsDaemon: false,
    outputPath: path.basename(__dirname)+'.out',
    pidPath: '/tmp/'+path.basename(__dirname)+'.pid'
  },
  auth: {
    enabled: false,
    mechanisms: [],
    userIdPrefix: "org.couchdb.user:"
  },
  session: {
    config: {
      key: 'jojoblog.sid',
      /*store: new JojoStore({
        internalStore: new MemoryStore
      }),*/
      // fingerprint: some fn,
      cookie: { path: '/', httpOnly: false, maxAge: 14400000 },
      secret: 'jojo blog key'
    },
    ignorePaths: ['/robots.txt' /*, '/other files'  */]
  },
  environments: {
    dev: {},
    test: {}, 
    prod: {}
  },
  //TODO: These states have some core functionality which should be moved in the framework
  states: {
      ready: {
          stateStartup: function(fsm, args) {
            jojo.logger.info({message:"app is currently waiting on requests", category:'jojo.http'});
            if (jojo.appOptions.onReady && typeof(jojo.appOptions.onReady) === 'function') {
              jojo.appOptions.onReady();
            }
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
              
              jojo.logger.trace({templateId:'separator', category:'jojo.http'});
              jojo.logger.trace({message:"processing request: ${url}", replacements:req, category:'jojo.http'});
                              
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
              jojo.logger.trace({message:"request took ${ms} milliseconds", replacements:{ms:diff}, category:'jojo.http'});
              jojo.logger.trace({templateId:'separator', category:'jojo.http'});
//                jojo.logger.flush();
          }
          delete jojo.request;
          delete jojo.response;
        }
      }
  },
  fsmListeners: []
};

jojo.start = function(options) {
  options = options || {};
  // merge options with default options (overwriting defaults if necessary).
  var mergedOptions = Object.extend(options, defaultOptions);
  
  if (mergedOptions.daemon.runAsDaemon) {
    var daemon = require("daemon");
    daemon.daemonize(mergedOptions.daemon.outputPath, mergedOptions.daemon.pidPath, function(err, pid) {
      jojo.init(mergedOptions);
    });
  } else {
    jojo.init(mergedOptions);
  }
};