exports.getWidget = function(feather, cb) {
  process.nextTick(function() {
    cb(null, {
      name: "api_tester.asyncwidget",
      path: "widgets/asyncwidget/"
    });
  });
};