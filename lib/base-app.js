var sys = require("sys"),
    Connect = require("connect"),
    path = require("path");

//bootstrap feather (default context object is 'global')
require("../lib/core").bootstrap(/*some custom context object can go here*/);

/**
 * @namespace Default options for use in a featherjs app.
 * @name AppOptions
 */
var defaultOptions = /** @lends AppOptions.prototype */ {
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
   * @property {boolean} [runAsDaemon=false] If true, run the app as a daemon.
   * @property {String} [outputPath="${appRoot}/${appName}.out"] The path to redirect stdout to when running in daemon mode.
   * @property {String} [pidPath="/tmp/${appName}.pid"] The path to write the daemon process's PID file to.
   */
  daemon: {
    runAsDaemon: false,
    outputPath: path.basename(__dirname)+'.out',
    pidPath: '/tmp/'+path.basename(__dirname)+'.pid'
  },
  /**
   * @namespace Container for authentication / authorization options
   * @property {boolean} [enabled=false] Whether or not your app will use auth mechanisms.
   * @property {String} [userIdPrefix="org.couchdb.user:"] A prefix to prepend onto usernames when looking up users in CouchDB.
   */
  auth: {
    enabled: false,
    userIdPrefix: "org.couchdb.user:"
  },
  /** 
   * @namespace Container for DOM pool size options.  Used in performance tuning. 
   * @property {number} [min=10] Minimum number of DOMs in the pool.  Must be >= 1 and <= max.
   * @property {number} [max=20] Maximum number of DOMs to allow in the pool.  Must be >= min. 
   */
  domPoolSize: { //TODO: need to run benchmarks to find the ideal poolsize for this.
    min: 10, 
    max: 20
  }, 
  /** 
   * @namespace Container for session settings. 
   * @property {Array} ignorePaths 
   * @see the connect middleware <a href="http://senchalabs.github.com/connect/middleware-session.html">session documentation</a> for options.
   */
  session: {
    /**
     * @namespace Container for session configuration.  This is passed as-is to the connect session middleware. 
     * @property {String} [key="featherblog.sid"] The key to use for the session cookie.
     * @property {Object} cookie Session cookie settings
     * @property {String} [cookie.path="/"] 
     * @property {boolean} [cookie.httpOnly=false] whether or not to make the session cookie http only.  HTTP only cookies are not accessible via javascript.
     * @property {number} [cookie.maxAge=14400000] 
     * @property {String} [secret="feather app key"] key used to encrypt session ids
     */
    config: {
      key: 'featherblog.sid',
      cookie: { path: '/', httpOnly: false, maxAge: 14400000 },
      secret: 'feather app key'
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
  fsmListeners: []
};

/**
 * @name AppOptions.onReady
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