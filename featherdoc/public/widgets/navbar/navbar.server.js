exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "featherdoc.navbar",
    path: "widgets/navbar/",
    links: [],

    prototype: {
      onInit: function(options) {
        // Retrieve navbar specific application settings
        // for use in the template.
        this.links = feather.appOptions.navbar || [];
      }
    }
  });
};
