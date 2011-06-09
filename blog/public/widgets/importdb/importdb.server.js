exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "blog.importdb",
    path: "widgets/importdb/",
    prototype: {
      runImport: feather.Widget.serverMethod(function(overwrite, _cb) {
        var me = this;
        feather.data.appdb.importDb({overwrite: overwrite}, function(err) {
          _cb(err, "Import complete.");
        });
      })
    }   
  });
};