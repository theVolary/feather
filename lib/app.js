// # app.js

var path = require("path"),
    fs   = require("fs"),
    util = require("util"),
    feather = require("./feather"),
    YUITest = require("yuitest"),
    TestRunner = YUITest.TestRunner;

// Initialize the directory structure and name of the application.

var appDir = process.cwd();
var appName = path.basename(appDir)
var appLibDir = path.join(appDir, 'lib');
var libDir = path.join(process.env.FEATHER_HOME, 'lib');

// Read in the configuration for the application from `config.json`.


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
var unitTestDir;
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
    case "test/unit":
      console.log("Initiating unit testing.");
      mergedOptions.testing = true;
      break;
    default:
      console.warn("Unrecognized option: " + arg);
      break;
  } // end switch
  arg = args.shift();
}

// Resolve environmental use
var abort = false;
if (mergedOptions.useEnv) {
  if (mergedOptions.environments[mergedOptions.useEnv]) {
    console.info("\nUsing " + mergedOptions.useEnv + " environment");
    mergedOptions.environment = mergedOptions.useEnv;
    mergedOptions = feather.recursiveExtend(mergedOptions, mergedOptions.environments[mergedOptions.useEnv]);
    delete mergedOptions.environments;

  } else if (path.existsSync(appDir + "/conf/" + mergedOptions.useEnv + ".json")) { // See if there is a conf folder with a json file with that env name.
    console.info("\nUsing " + mergedOptions.useEnv + " environment from external file.");
    var envOptions = JSON.parse(fs.readFileSync(appDir + "/conf/" + mergedOptions.useEnv + ".json", "utf-8"));
    mergedOptions = feather.recursiveExtend(mergedOptions, envOptions);
    delete mergedOptions.environments;

  } else {
    console.error("Environment \"" + mergedOptions.useEnv + "\" does not exist in the configuration.  Aborting startup.");
    abort = true;
  }
}

// Now finally tack on the command line overrides.
mergedOptions = feather.recursiveExtend(mergedOptions, customArgs);
if (process.argv[1] === "debug") {
  console.info("Merged options: " + util.inspect(mergedOptions));
}
exports.appOptions = mergedOptions;
if (mergedOptions.testing) {
  exports.feather = feather;
} else {
  if (abort === false) {
    feather.start(mergedOptions);
  } else {
    process.nextTick(function() {
      process.exit(0);
    });
  }
}
