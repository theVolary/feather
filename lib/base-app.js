var sys = require("sys"),
    Connect = require("connect"),
    path = require("path");

//bootstrap feather (default context object is 'global')
require("../lib/core").bootstrap(/*some custom context object can go here*/);

/**
 * @namespace Default options for use in a featherjs app.
 */
var defaultOptions = {
  // Any property /not/ in the environments block is global to all environments 
  // and is the default.  Each environment may still override.
  /** 
   * If true, put the application in debug mode
   * @type boolean
   * @default false
   */
  debug: false,
  
  /** 
   * The name of the environment to run in
   * @type String
   * @default "dev"
   */
  useEnv: 'dev',
  /**
   * The path to featherjs's lib folder.  Should be referenced from your application folder.  Normally you will not have to override this.
   * @type String
   * @default "../lib"
   */
  featherRoot: "../lib/",
  /**
   * The path to your application.  You MUST set this in your own app's options.
   * @type String
   */
  appRoot: __dirname,
  /**
   * @namespace Container for daemon options.
   */
  daemon: {
    /**
     * If true, run the app as a daemon.
     * @type boolean
     * @default false
     */
    runAsDaemon: false,
    /**
     * The path to redirect stdout to when running in daemon mode.
     * @type String
     * @default appRoot/appName.out
     */
    outputPath: path.basename(__dirname)+'.out',
    /**
     * The path to write the daemon process's PID file to.
     * @type String
     * @default "/tmp/appName.pid"
     */
    pidPath: '/tmp/'+path.basename(__dirname)+'.pid'
  },
  /**
   * @namespace Container for authentication / authorization options
   */
  auth: {
    /**
     * Whether or not your app will use auth mechanisms.
     * @type boolean
     * @default false
     */
    enabled: false,
    /**
     * A prefix to prepend onto usernames when looking up users in CouchDB.
     * @type String
     * @default "org.couchdb.user:"
     */
    userIdPrefix: "org.couchdb.user:"
  },
  /** @namespace Container for DOM pool size options.  Used in performance tuning. */
  domPoolSize: { //TODO: need to run benchmarks to find the ideal poolsize for this.
    /** 
     * Minimum number of DOMs in the pool.  Must be >= 1 and <= max. 
     * @type number
     * @default 1 
     */
    min: 10, 
    /** 
     * Maximum number of DOMs to allow in the pool.  Must be >= min. 
     * @type number
     * @default 20 
     */
    max: 20
  }, 
  /** 
   * @namespace Container for session settings. 
   * @property {Object} config Container for session configuration.  This is passed as-is to the connect session middleware.
   * @property {Array} ignorePaths 
   * @see the connect middleware <a href="http://senchalabs.github.com/connect/middleware-session.html">session documentation</a> for options.
   */
  session: {
    config: {
      key: 'featherblog.sid',
      cookie: { path: '/', httpOnly: false, maxAge: 14400000 },
      secret: 'feather blog key'
    },
    ignorePaths: ['/robots.txt' /*, '/other files'  */]
  },
  /**
   * @namespace Container for namespaces.  Any names are valid.  By default, dev, test, and prod are provided (but are empty).
   */
  environments: {
    dev: {},
    test: {}, 
    prod: {}
  },
  //TODO: These states have some core functionality which should be moved in the framework
  states: {
    ready: {
      stateStartup: function(fsm, args) {
        feather.logger.info({message:"app is currently waiting on requests", category:'feather.http'});
        if (feather.appOptions.onReady && typeof(feather.appOptions.onReady) === 'function') {
          feather.appOptions.onReady();
          delete feather.appOptions.onReady;
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
        
        feather.logger.trace({templateId:'separator', category:'feather.http'});
        feather.logger.trace({message:"processing request: ${url}", replacements:req, category:'feather.http'});
                        
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
        if (feather.logger) {
          feather.logger.trace({message:"request took ${ms} milliseconds", replacements:{ms:diff}, category:'feather.http'});
          feather.logger.trace({templateId:'separator', category:'feather.http'});
        }
        delete feather.request;
        delete feather.response;
      }
    }
  },
  fsmListeners: []
};

/**
 * @name defaultOptions.onReady
 * @function
 * @description A function that will be run as soon as the app is initialized and running.
 * @default null
 */

/*
 * This function should allow the original object to be extended in such a way that if the 
 * new object (n) already contains a property of the old (o) and it is an object, it delves 
 * into the old object and overrides individual properties instead of replacing the whole object. 
 */
function recursiveExtend(n, o) {
  var type = null;
  for (var p in o) {
    
    if (n[p] && typeof(n[p]) === "object") {
      n[p] = recursiveExtend(n[p], o[p]);
    } else {
      n[p] = o[p];
    }
  }
  return n;
} 

feather.start = function(options) {
  options = options || {};
  // merge options with default options (overwriting defaults if necessary).
  var mergedOptions = recursiveExtend(recursiveExtend({}, defaultOptions), options);
  
  if (mergedOptions.daemon.runAsDaemon) {
    var daemon = require("daemon");
    daemon.daemonize(mergedOptions.daemon.outputPath, mergedOptions.daemon.pidPath, function(err, pid) {
      feather.init(mergedOptions);
    });
  } else {
    feather.init(mergedOptions);
  }
};