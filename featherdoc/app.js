exports.onReady = function() {
  feather.ns("featherdoc"); // ensure the namespace exists.
  var MarkdownCache = require("./lib/MarkdownCache").MarkdownCache;
  featherdoc.markdownCache = new MarkdownCache(10000);
};