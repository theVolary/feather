var util = require("util"),
    path = require("path"),
    fs   = require("fs"),
    featherUtil = require("./util"),
    sc   = require("./simple-cache"),
    _    = require("underscore")._,
    Registry = require("./registry"),
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
        consolidatedContent = publisher.concat(),
        publishBuffer = new Buffer(consolidatedContent, 'utf-8'),
        headers = {
          "Content-Type": publisher.options.contentType
        };

      var s3Options = {
        key: options.config.key,
        secret: options.config.secret,
        bucket: options.config.bucket.toLowerCase()
      };
      if (options.config.endpoint) {
        s3Options.endpoint = options.config.endpoint;
      }
      var s3Client = knox.createClient(s3Options);
      var baseUrl = options.config.publishUri || s3Client.url('');

      var publishResult = {
        files: [],
        consolidatedUrl: baseUrl + '/' + publisher.id
      };
      _.each(publisher.componentOrder, function(name) {
        publishResult.files.push({url: publisher.components[name].url});
      });

      var finishPublish = function(err) {
        cb && cb(err, publishResult);
        var published = publishedPublishers.findById(publisher.id);
        if (!published) {
          publisher.on("componentChanged", function() {
            module.exports.publish(options, publisher);
          });
          publishedPublishers.add(publisher);
        }
      };

      if (options.config.acl) {
        headers['x-amz-acl'] = options.config.acl;
      }
      logger.debug({ 
        message: "Publishing ${id} to s3 url ${url}", 
        replacements: { 
          id: publisher.id, url: s3Client.url('') + "/" + publisher.id 
        }, 
        category: 'feather.respub' });
      s3Client.putBuffer(publishBuffer, publisher.id, headers, function(err, res) {
        if (err) {
          logger.error({message: "Error publishing ${id} to s3 bucket ${bucket}: ${msg}", replacements: {id: publisher.id, bucket: options.config.bucket, msg: err}, exception: err, category: 'feather.respub' });
          cb("Error publishing " + publisher.id + " to s3 bucket " + options.config.bucket + ": " + err);
        } else {
          finishPublish(err);
        }
      });
    });
  }
};