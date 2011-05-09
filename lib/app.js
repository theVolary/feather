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

feather.start(mergedOptions);
