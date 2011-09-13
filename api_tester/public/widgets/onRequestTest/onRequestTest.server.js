exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "api_tester.onRequestTest",
    path: "widgets/onRequestTest/",
    prototype: {
      onRequest: function(_cb) {
        _cb(null, "bar");
      }
    }
  });
};