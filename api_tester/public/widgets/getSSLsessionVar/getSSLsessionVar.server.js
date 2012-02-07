exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "api_tester.getSSLsessionVar",
    path: "widgets/getSSLsessionVar/",
    prototype: {
      getSessionVar: feather.Widget.serverMethod(function(_cb) {
        _cb(null, this.request.session.sslVar);
      })
    }
  });
};