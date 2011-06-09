exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "api_tester.sessionTests",
    path: "widgets/sessionTests/",
    prototype: {
      setSessionFoo: feather.Widget.serverMethod(function(cb) {
        this.request.session.foo = "server foo";
        cb(null, "foo set");
      }),
      getSessionFoo: feather.Widget.serverMethod(function(cb) {
        cb(null, this.request.session.foo);
      })
    }
  });
};