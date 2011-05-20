var path = require("path"),
    fs   = require("fs"),
    util = require("util");
    
var appDir = process.cwd();
var appName = path.basename(appDir)
var appLibDir = path.join(appDir, 'lib');
var libDir = path.join(process.env.FEATHER_HOME, 'lib');

//bootstrap feather (default context object is 'global')
require("./core").bootstrap(/*some custom context object can go here*/);

/**
 * @name AppOptions.onReady
 * @function
 * @description A function that will be run as soon as the app is initialized and running.
 * @default null
 */

// Read default options.
var defaultOptions = JSON.parse(fs.readFileSync(libDir + '/config.json', "utf-8")),
    options = null,
    hooks = null;
// Add on properties that can't live in JSON files.
defaultOptions.featherRoot = process.env.FEATHER_HOME + "/lib";
defaultOptions.appRoot = appDir;
defaultOptions.daemon.outputPath = appDir + "/" + appName + ".out";
defaultOptions.daemon.pidPath = '/tmp/' + appName + '.pid';

// Load the app's options.
if (path.existsSync(appDir + '/config.json')) {
  options = JSON.parse(fs.readFileSync(appDir + '/config.json', "utf-8"));
}
if (path.existsSync(appDir + '/app.js')) {
  hooks = require(appDir + "/app.js");
} 

// Initialize default options.
var mergedOptions = feather.recursiveExtend({}, defaultOptions);

if (options) { // Add custom options from app's config.json
  mergedOptions = feather.recursiveExtend(mergedOptions, options);
}
if (hooks) { // Add hook events from app's app.js.
  mergedOptions = feather.recursiveExtend(mergedOptions, hooks);
}

// Check process args to see if any options were overridden at runtime.
var args = process.argv.slice(3), index = 0, arg, customArgs = {};
arg = args.shift();
while (arg) {
  switch(arg) {
    case "env":
      mergedOptions.useEnv = args.shift();
      break;
    case "daemonize": 
      if (!customArgs.daemon) customArgs.daemon = {};
      customArgs.daemon.runAsDaemon = true;
      break;
    case "outputpath":
      if (!customArgs.daemon) customArgs.daemon = {};
      customArgs.daemon.outputPath = args.shift();
      break;
    case "pidpath":
      if (!customArgs.daemon) customArgs.daemon = {};
      customArgs.daemon.pidPath = args.shift();
      break;
    case "dompoolmax": 
      if (!customArgs.domPoolSize) customArgs.domPoolSize = {};
      customArgs.domPoolSize.max = args.shift();
      break;
    case "dompoolmin": 
      if (!customArgs.domPoolSize) customArgs.domPoolSize = {};
      customArgs.domPoolSize.min = args.shift();
      break;
    case "loglevel":
      var level = args.shift();
      customArgs.logging = {
        enabled: (level !== "off"),
        defaultLevel: level
      };
      break;
    default:
      console.warn("Unrecognized option: " + arg);
      break;
  } // end switch
  arg = args.shift();
}

// Resolve environmental use
if (mergedOptions.useEnv) {
  console.info("Using " + mergedOptions.useEnv + " environment");
  mergedOptions.environment = mergedOptions.useEnv;
  mergedOptions = feather.recursiveExtend(mergedOptions, mergedOptions.environments[mergedOptions.useEnv]);
  delete mergedOptions.environments;
}

// Now finally tack on the command line overrides.
mergedOptions = feather.recursiveExtend(mergedOptions, customArgs);
if (process.argv[1] === "debug") {
  console.info("Merged options: " + util.inspect(mergedOptions));
}
feather.start(mergedOptions);
