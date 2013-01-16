var util = require("util"),
    path = require("path"),
    fs   = require("fs"),
    featherUtil = require("./util"),
    sc   = require("./simple-cache"),
    _    = require("underscore")._,
    Registry = require("./registry"),
    Semaphore = require("./semaphore"),
    knox = require("knox"); // S3 lib

var publishedPublishers = new Registry();

module.exports = {

  id: "s3", 

  publish: function(options, publisher, cb) {
    sc.getItems([
      "feather-options",
      "feather-logger"
    ], function(err, cacheItems) {
      var appOptions = cacheItems["feather-options"],
        logger = cacheItems["feather-logger"],
        publisherOptions = options.publisherOptions,
        packageOptions = options.packageOptions,
        headers = {
          "Content-Type": publisher.options.contentType,
          "x-amz-acl": publisherOptions.config.acl || "private"
        };

      var s3Options = {
        key: publisherOptions.config.key,
        secret: publisherOptions.config.secret,
        bucket: publisherOptions.config.bucket.toLowerCase()
      };
      if (publisherOptions.config.endpoint) {
        s3Options.endpoint = publisherOptions.config.endpoint;
      }
      var s3Client = knox.createClient(s3Options);
      var baseUrl = publisherOptions.config.publishUri || s3Client.url('');

      var publishResult = {
        components: []
      };

      _.each(publisher.componentOrder, function(name) {
        publishResult.components.push({url: publisher.components[name].url});
      });
      
      var finishPublish = function(err) {
        cb && cb(err, publishResult);
        var published = publishedPublishers.findById(publisher.id);
        if (!published) {
          publisher.on("componentChanged", function() {
            module.exports.publish(publisherOptions, publisher);
          });
          publishedPublishers.add(publisher);
        }
      };
      if (packageOptions.consolidate) {
        logger.debug({ 
          message: "Publishing ${id} to s3 url ${url}", 
          replacements: { id: publisher.id, url: baseUrl + "/" + publisher.id }, 
          category: 'feather.publisher.s3' });
        publishResult.consolidatedUrl = baseUrl + '/' + publisher.id;
        s3Client.putBuffer(new Buffer(publisher.concat(), 'utf-8'), path.join(publisherOptions.config.bucketFolder, publisher.id), headers, function(err, res) {
          if (err) {
            logger.error({
              message: "Error publishing ${id} to s3 bucket ${bucket}: ${msg}", 
              replacements: {id: publisher.id, bucket: publisherOptions.config.bucket, msg: err}, 
              exception: err, 
              category: 'feather.publisher.s3' });
            cb("Error publishing " + publisher.id + " to s3 bucket " + publisherOptions.config.bucket + ": " + err);
          } else {
            finishPublish(err);
          }
        });
      } else {
        logger.info({
          message: "Publishing non-consolidated ${pkg} items to ${url}",
          replacements: {
            pkg: packageOptions.cacheName,
            url: baseUrl + '/...' 
          },
          category: 'feather.publisher.s3'
        });
        var errs = [],
            componentPubSem = new Semaphore(function() {
              finishPublish(errs.join(';'));
            });
        _.each(publisher.components, function(component, key) {
          logger.debug({
            message: "Publishing ${bucketFolder}/${relativePath} to ${url}",
            category: "feather.publisher.s3",
            replacements: { 
              bucketFolder: publisherOptions.config.bucketFolder, 
              relativePath: component.relativePath,
              url: component.url
            }
          });
          componentPubSem.increment();
          s3Client.putBuffer(new Buffer(component.content, 'utf-8'), 
              path.join(publisherOptions.config.bucketFolder, component.relativePath), 
              headers, function(err, res) {
            if (err) errs.push("Component " + component.name + ": " + err);
            componentPubSem.execute();
          });
        });
      }
    });
  }
};