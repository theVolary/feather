exports.getWidget = function(feather, cb) {
  feather.ns("featherdoc");
  cb(null, {
    name:"featherdoc.docengine",
    path:"w/docengine"
  });
};