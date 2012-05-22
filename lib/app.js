// # app.js

var path = require("path"),
    fs   = require("fs"),
    util = require("util"),
    feather = require("./feather"),
    YUITest = require("yuitest"),
    TestRunner = YUITest.TestRunner,
    featherConfig = require("feather-config");

// Initialize the directory structure and name of the application.

var appDir = process.cwd();
var appName = path.basename(appDir)
var appLibDir = path.join(appDir, 'lib');
var libDir = path.join(process.env.FEATHER_HOME, 'lib');

featherConfig.init({

  appDir: appDir,
  defaultConfigPath: libDir + '/config.json',
  defaultOptionsHook: function(defaultOptions) {
    defaultOptions.featherRoot = process.env.FEATHER_HOME + "/lib";
    defaultOptions.appRoot = appDir;
    defaultOptions.daemon.outputPath = appDir + "/" + appName + ".out";
    defaultOptions.daemon.pidPath = '/tmp/' + appName + '.pid';
  },
  commandLineArgsHook: function(arg, remainingArgs, cmdLineOptions) {
    switch(arg) {
      case "env": 
        // ignore this, as it is taken care of in feather-config, but chew it up so we don't get unrecognized option warnings.
        remainingArgs.shift();
        break;
      case(appDir):
        break;
      case "daemonize": 
        if (!cmdLineOptions.daemon) cmdLineOptions.daemon = {};
        cmdLineOptions.daemon.runAsDaemon = true;
        break;
      case "outputpath":
        if (!cmdLineOptions.daemon) cmdLineOptions.daemon = {};
        cmdLineOptions.daemon.outputPath = remainingArgs.shift();
        break;
      case "pidpath":
        if (!cmdLineOptions.daemon) cmdLineOptions.daemon = {};
        cmdLineOptions.daemon.pidPath = remainingArgs.shift();
        break;
      case "dompoolmax": 
        if (!cmdLineOptions.domPoolSize) cmdLineOptions.domPoolSize = {};
        cmdLineOptions.domPoolSize.max = remainingArgs.shift();
        break;
      case "dompoolmin": 
        if (!cmdLineOptions.domPoolSize) cmdLineOptions.domPoolSize = {};
        cmdLineOptions.domPoolSize.min = remainingArgs.shift();
        break;
      case "loglevel":
        var level = remainingArgs.shift();
        cmdLineOptions.logging = {
          enabled: (level !== "off"),
          defaultLevel: level
        };
        break;
      case "test/unit":
        console.log("Initiating unit testing.");
        cmdLineOptions.testing = true;
        break;

      default:
        console.warn("Unrecognized option: " + arg);
        break;
    } // end switch
  }

}, function(err, config) {

  var appHooks = null;

  if (path.existsSync(appDir + '/app.js')) {
    appHooks = require(appDir + "/app.js");
  } 

  if (appHooks) { // Add hook events from app's app.js.
    config = feather.recursiveExtend(config, appHooks);
  }

  if (process.argv[1] === "debug") {
    console.info("Final config hierarchy: " + config.dumpBuildInfo());
    console.info("Final config: " + util.inspect(config));
  }

  exports.appOptions = config;
  if (config.testing) {
    exports.feather = feather;
  } else {
    if (! err) {
      feather.start(config);
    } else {
      console.error(util.inspect(err));
      process.nextTick(function() {
        process.exit(0);
      });
    }
  }

});
