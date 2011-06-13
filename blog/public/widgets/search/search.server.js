exports.getWidget = function(feather, cb) { 
  cb(null, {
    name: "blog.search",
    path: "widgets/search/"
  });
};