var path = require("path"),
    fs = require("fs"),
    futil = require("./lib/util"),
    ns = require("./lib/ns");

/* 

## Conventions used in this module

* Default config file name is config.json
* Default config file folder is conf.

## Config Options Object (_options)

* appDir - The base directory to use for calculating paths.  Defaults to process.cwd()
* defaultConfigPath - path to the default config file.  If omitted, no default config will be used.
* appConfigPath - the path to the application's config file.  If omitted, defaults to `appDir + "/config.json"`.
* defaultOptionsHook - function the defaultOptions are passed into in case the app wishes to augment them before proceeding.  This is called immediately after the default config file is read, and it _must_ be synchronous.
* commandLineArgsHook - function to process individual command line arguments.  It _must_ be synchronous.

*/ 
exports.init = function(_options, cb) {

  _options = _options || {};
  
  var appDir = _options.appDir || process.cwd(),
      defaultConfFile = _options.defaultConfigPath || null,
      appConfFile = _options.appConfigPath || (appDir + "/config.json"),
      defaultOptions = {},
      appOptions = null,
      _breadcrumb = [];

  if (defaultConfFile && path.existsSync(defaultConfFile)) {
    defaultOptions = JSON.parse(fs.readFileSync(defaultConfFile, "utf-8"));
    _breadcrumb.push("Default options from " + defaultConfFile);
  }

  if (_options.defaultOptionsHook && typeof (_options.defaultOptionsHook) === "function") {
    _options.defaultOptionsHook(defaultOptions);
    _breadcrumb.push("Default hook used");
  }

  if (path.existsSync(appConfFile)) {
    appOptions = JSON.parse(fs.readFileSync(appConfFile, "utf-8"));
    _breadcrumb.push("App options from " + appConfFile);
  }

  var mergedOptions = futil.recursiveExtend({}, defaultOptions);

  if (appOptions) {
    mergedOptions = futil.recursiveExtend(mergedOptions, appOptions);
  }

  var cmdLineOptions = {}, 
      i,
      argIndex = process.argv.indexOf(process.mainModule.filename) + 1;
  var cmdArgs = argIndex < process.argv.length ? process.argv.slice(argIndex) : process.argv,
      usingCmdArgs = false;;

  // have to handle the environment selection up front.
  for (i = 0; i < cmdArgs.length; i++) {
    if (cmdArgs[i] === "env" && i < cmdArgs.length-1) {
      mergedOptions.useEnv = cmdArgs[i+1];
      break;
    }
  }

  // Resolve environmental use.
  var error = null;
  if (mergedOptions.useEnv) { 
    if (mergedOptions.environments && mergedOptions.environments[mergedOptions.useEnv]) {
      //console.info("\nUsing " + mergedOptions.useEnv + " environment");
      mergedOptions.environment = mergedOptions.useEnv;
      mergedOptions = futil.recursiveExtend(mergedOptions, mergedOptions.environments[mergedOptions.useEnv]);
      delete mergedOptions.environments;
      _breadcrumb.push("App config env " + mergedOptions.environment);

    } else if (path.existsSync(appDir + "/conf/" + mergedOptions.useEnv + ".json")) { // See if there is a conf folder with a json file with that env name.
      //console.info("\nUsing " + mergedOptions.useEnv + " environment from external file.");
      var filename = appDir + "/conf/" + mergedOptions.useEnv + ".json",
          envOptions = JSON.parse(fs.readFileSync(filename, "utf-8"));
      mergedOptions = futil.recursiveExtend(mergedOptions, envOptions);
      delete mergedOptions.environments;
      _breadcrumb.push("Environment options from " + filename);
    } else {
      error = "Environment \"" + mergedOptions.useEnv + "\" does not exist in the configuration.";
    }
  }

  // Now finally tack on the command line overrides.
  if (_options.commandLineArgsHook && typeof(_options.commandLineArgsHook) === "function") {
    var arg = cmdArgs.shift();
    usingCmdArgs = true;
    while (arg) {
      _options.commandLineArgsHook(arg, cmdArgs, cmdLineOptions);
      arg = cmdArgs.shift();
    }

    mergedOptions = futil.recursiveExtend(mergedOptions, cmdLineOptions);
    _breadcrumb.push("Command line args in use");
  }

  if (error) {
    cb(error);
  } else {
    _breadcrumb = _breadcrumb.join(' -> ');
    // Add on an internal null-safe get function.
    mergedOptions.safeGet = function(path) {
      return ns(path, this, true);
    };
    mergedOptions.dumpBuildInfo = function() {
      return _breadcrumb;
    }
    // Finally, call back with the resulting options object.
    cb(null, mergedOptions);
  }
};

exports.safeGet = function(path, object) {
  return ns(path, object, true);
};

