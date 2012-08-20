var util = require("util"),
    path = require("path"),
    fs   = require("fs"),
    featherUtil = require("./util"),
    sc   = require("./simple-cache"),
    _    = require("underscore")._,
    Registry = require("./registry");

var publishedPublishers = new Registry();

module.exports = {

  id: "local", 

  publish: function(options, publisher, cb) {
    sc.getItems([
      "feather-options",
      "feather-logger"
    ], function(err, cacheItems) {
      var appOptions = cacheItems["feather-options"],
        logger = cacheItems["feather-logger"],
        publishDir = path.join(appOptions.publicRoot, options.config.publishLocation),
        publishPath = path.join(publishDir, publisher.id),
        baseUrl = options.config.publishLocation,
        condolidatedContent = publisher.concat();

      if (publisher.id.indexOf("/") > -1) {
        var parts = publisher.id.split("/");
        for (var i = 0; i < parts.length - 1; i++) {
          publishDir = path.join(publishDir, parts[i]);
        }
      }

      if (baseUrl[0] !== "/") baseUrl = "/" + baseUrl;

      var publishResult = {
        files: [],
        consolidatedUrl: path.join(baseUrl, publisher.id)
      };
      
      _.each(publisher.componentOrder, function(name) {
        publishResult.files.push({url: publisher.components[name].url});
      });

      function finishPublish(err) {
        cb && cb(err, publishResult);
        var published = publishedPublishers.findById(publisher.id);
        if (!published) {
          publisher.on("componentChanged", function() {
            module.exports.publish(options, publisher);
          });
          publishedPublishers.add(publisher);
        }
      }

      fs.exists(publishDir, function(exists) {
        if (exists) {
          fs.stat(publishDir, function(err, stats) {
            if (err) cb(err); else {
              if (stats.isDirectory()) {
                fs.writeFile(publishPath, condolidatedContent, "utf-8", function(err) {
                  finishPublish(err);                  
                });
              } else {
                cb(publishDir + " exists, but is not a directory");
              }
            }
          });
        } else {
          var mkdirResult = featherUtil.mkdirpSync(publishDir, 0755);
          if (mkdirResult.result) {
            fs.writeFile(publishPath, condolidatedContent, "utf-8", function(err) {
              finishPublish(err);
            });
          } else {
            logger.error("Could not create " + publishDir + ".  err is " + util.inspect(err) );
            cb(publishDir + " does not exist and couldn't be created: " + err);
          }
        }
      });
    });
  }
};