exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "api_tester.setSSLsessionVar",
    path: "widgets/setSSLsessionVar/",
    prototype: {
      onRequest: function(_cb) {
        this.request.session.sslVar = "123";
        _cb();
      }
    }
  });
};