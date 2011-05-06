exports.onReady = function() {
  feather.ns("feather.blog");
  var BlogApi = require("./lib/blogapi").BlogApi;
  feather.blog.api = new BlogApi();
};