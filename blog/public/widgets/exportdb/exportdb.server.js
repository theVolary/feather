exports.getWidget = function(feather, cb) {  
  cb (null, {
    name: "blog.exportdb",
    path: "widgets/exportdb/",
    prototype: {
      runExport: feather.Widget.serverMethod(function(_cb) {
        var me = this;
        feather.data.appdb.exportDb({}, function(err) {
          _cb(err, "Export Complete.");
        });
      })
    } // end prototype
  });
};