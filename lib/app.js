// # app.js

var _ = require('underscore'),
    path = require("path"),
    fs   = require("fs"),
    util = require("util"),
    feather = require("./feather"),
    featherConfig = require("feather-config"),
    cluster = require('cluster'),
    os = require('os');

/* ------------------------------------------------------------------ */

// Initialize the directory structure and name of the application.
if (fs.existsSync(appDir + '/app.js')) {
  appHooks = require(appDir + "/app.js");
} 

var appDir = process.cwd();
var appName = path.basename(appDir);
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
      case "extras":
        var extras = remainingArgs.shift();
        cmdLineOptions.extras = extras;
        break;
      default:
        console.warn("Unrecognized option: " + arg);
        break;
    } // end switch
  }

}, function(err, config) {

  if (config && config.daemon && config.daemon.runAsDaemon && !process.env.IS_FEATHER_DAEMON) {
    console.log('daemonizing pid ' + process.pid + ' ...');
    require('daemon')();
    process.env.IS_FEATHER_DAEMON = true;
    console.log('daemonized process continuing on pid ' + process.pid);
    if (config.daemon.pidPath) {
      fs.writeFileSync(config.daemon.pidPath, process.pid);
    }
  }

  if (!err && _.contains(process.execArgv, '--debug-brk')) {
    console.info("Final config hierarchy: " + config.dumpBuildInfo());
    console.info("Final config: " + JSON.stringify(config));
  }

  if (config && config.testing) {
    exports.feather = feather;
  } else {
    if (! err) {

      var appHooks = null;

      if (fs.existsSync(appDir + '/app.js')) {
        appHooks = require(appDir + "/app.js");
      } 

      if (appHooks) { // Add hook events from app's app.js.
        config = feather.recursiveExtend(config, appHooks);
      }

      //add the "extra" config options if any were passed in
      if (config.extras) {
        var extras = config.extras.split(',');
        _.each(extras, function(xtra) {
          var parts = xtra.split(':');
          var key = parts[0];
          var value = parts.length == 2 ? parts[1] : true;
          config[key] = value;
        });
      }

      exports.appOptions = config;

      function error(err) {
        if (err) {
          console.error(util.inspect(err));
          process.nextTick(function() {
            process.exit(0);
          });
        }
      }

      function start() {
        if (config.cluster && cluster.isMaster) {

          // tag feather as master and run through startup
          // (certain tasks only need to be performed once)
          // fork workers when those tasks are complete
          config.isMaster = true;
          console.log('master bootstrap process underway...');
          feather.start(config, function(err) {

            if (err) {
              error(err);
            } else {

              console.log('master bootstrap process complete...');

              // spawn the clustered processes (1 per CPU)
              var numWorkers = os.cpus().length;
              for (var i = 0; i < numWorkers; i++) {
                cluster.fork();
              }

              //TODO: do we need to do anything with cluster.workers here?
            }
          });

        } else if (config.cluster) {
          
          config.isWorker = true;
          console.log('forked worker: ' + cluster.worker.id);
          feather.start(config, error);

        } else {

          // single process: is both master and worker
          config.isMaster = true;
          config.isWorker = true;
          console.log('not clustering - bootstrapping and starting server in one process...');
          feather.start(config, error);
        }
      }

      start();
      
    } else {
      console.error(err);
      process.nextTick(function() {
        process.exit(0);
      });
    }
  }

});
