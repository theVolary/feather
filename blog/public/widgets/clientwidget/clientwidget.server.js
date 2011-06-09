exports.getWidget = function(feather, cb) {
  cb(null, {
    name : "blog.clientwidget",
    path : "widgets/clientwidget/"
  });
};