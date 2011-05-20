feather.ns("featherdoc");

var md = require("node-markdown").Markdown,
    fs = require("fs"),
    path = require("path");
    //request = require("request");

featherdoc.getMarkdown = function(filePath, method, cb) {
  feather.logger.info("In getMarkdown");
  var myPath = (method === "fs") ? path.normalize(feather.appOptions.appRoot + '/' + filePath) : filePath;
  var doc = featherdoc.markdownCache.get(myPath);
  if (doc) {
    feather.logger.info({message:"Returning cached document for "+myPath, category: "featherdoc"});
    cb(null, {doc: doc});
  } else {
    feather.logger.info({message:"Loading " + myPath, category:"featherdoc"});
    if (method === "fs") {
      fs.readFile(myPath, "utf-8", function(err, data) {
        if (!err) {
          var output = md(data);
          featherdoc.markdownCache.add(myPath, output);
          cb(null, {doc: output});
        } else {
          feather.logger.error({message:"Error getting markdown doc: " + err.reason, exception:err, category:"featherdoc"});
          cb(err, null);
        }
      });
    } else if (method === "url") {
      feather.logger.info({message:"Requesting " + myPath, category: "featherdoc"});
      request({url:myPath}, function(err, res, body) {
        if (!err) {
          if (res.statusCode == 200) {
            var output = md(body);
            featherdoc.markdownCache.add(myPath, output);
            cb(null, {doc: output});
          } else {
            feather.logger.error("Error getting markdown doc: " + res.statusCode);
            cb(null, {doc: myPath + ": " + res.statusCode});
          }
        } else {
          cb(err);
        }
      });
    } else {
      feather.logger.error({message:"Unknown doc lookup method: " + method, category: "featherdoc"});
      cb("Unknown doc lookup method: " + method);
    }
  }
};

featherdoc.markdown = feather.widget.create({
	name: "featherdoc.markdown",
	path: "w/markdown/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		}
	}		
});
