var util = require("util"),
    path = require("path"),
    fs   = require("fs"),
    sc   = require("./simple-cache");

module.exports = {

  id: "local", 

  publish: function(options, content, callback) {
    sc.getItems([
      "feather-options",
      "feather-logger"
    ], function(err, cacheItems) {
      var appOptions = cacheItems["feather-options"];
      var logger = cacheItems["feather-logger"];
      var publishDir = path.join(appOptions.publicRoot, options.publishLocation);
      var publishPath = path.join(publishDir, options.id);

      logger.debug("Checking for path " + publishDir);
      path.exists(publishDir, function(exists) {
        if (exists) {
          logger.debug("Path " + publishDir + " exists");
          fs.stat(publishDir, function(err, stats) {
            debugger;
            if (!err) {
              if (stats.isDirectory()) {
                logger.debug("Writing to " + publishPath);
                fs.writeFile(publishPath, content, "utf-8", function(err) {
                  callback && callback(err);
                });
              } else {
                callback && callback(publishDir + " exists, but is not a directory");
              }
            } else {
              callback && callback(err);
            }
          });
        } else {
          logger.debug("Directory " + publishDir + " does not exist.  Creating...");
          fs.mkdir(publishDir, 0755, function(err) {
            debugger;
            if (!err || err.code === 'EEXIST') { // Someone else may have created it before we tried.
              logger.debug("Writing to " + publishPath);
              fs.writeFile(publishPath, content, "utf-8", function(err) {
                callback && callback(err);
              });
            } else {
              logger.error("Could not create " + publishDir + ".  err is " + util.inspect(err) );
              callback && callback(publishDir + " does not exist and couldn't be created: " + err);
            }
          });
        }
      });
    });
  }
};