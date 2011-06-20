exports.onReady = function(feather) {
  feather.ns("featherdoc"); // ensure the namespace exists.
  var MarkdownCache = require("./lib/MarkdownCache").MarkdownCache;
  featherdoc.markdownCache = new MarkdownCache(feather, 10000);
};