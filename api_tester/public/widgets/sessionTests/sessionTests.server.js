feather.ns("api_tester");
api_tester.sessionTests = feather.widget.create({
  name: "api_tester.sessionTests",
  path: "widgets/sessionTests/",
  prototype: {
    initialize: function($super, options) {
      $super(options);

    },
    setSessionFoo: feather.widget.serverMethod(function(cb) {
      this.request.session.foo = "server foo";
      cb(null, "foo set");
    }),
    getSessionFoo: feather.widget.serverMethod(function(cb) {
      cb(null, this.request.session.foo);
    })
  }
});