exports.onReady = function(feather) {
  var BlogApi = require("./lib/blogapi").BlogApi;
  feather.blog = {
    api: new BlogApi(feather)
  };
};