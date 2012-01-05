var _ = require("underscore")._;

exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "api_tester.dataAbstractionTest",
    path: "widgets/dataAbstractionTest/",
    prototype: {
      onReady: function() {
        // pre-populate the test database.

        feather.logger.trace("data abstraction test ready");
      },
      doGet: feather.Widget.serverMethod(function(options, callback) {
        var me = this;
        feather.data.appdb.get(options, function(err, results) {
          callback(err, results);
        });
      }),
      doSave: feather.Widget.serverMethod(function(options, callback) {
        var me = this;
        feather.data.appdb.save(options, function(err, results) {
          callback(err, results);
        });
      }),
      doRemove: feather.Widget.serverMethod(function(options, callback) {
        var me = this;
        feather.data.appdb.remove(options, function(err, results) {
            callback(err, results);
        });
      }),
      doExists: feather.Widget.serverMethod(function(options, callback) {
        var me = this;
        feather.data.appdb.exists(options, function(err, results) {
          callback(err, results);
        });
      }),
      doFind: feather.Widget.serverMethod(function(options, callback) {
        var me = this;
         feather.data.appdb.find(options, function(err, results) {
          callback(err, results);
        });
      })
    }
  });
};