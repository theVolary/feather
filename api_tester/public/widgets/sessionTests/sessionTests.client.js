feather.ns("api_tester");
(function() {

  api_tester.sessionTests = feather.widget.create({
    name: "api_tester.sessionTests",
    path: "widgets/sessionTests/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      },
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Session Tests");

        suite.add(new Y.Test.Case({
          name: "Set and Get session.foo",
          setUp: feather.emptyFn,
          tearDown : feather.emptyFn,

          testSetSessionFoo: function () {
            var test = this;
            me.server_setSessionFoo(function(args) {
              test.resume();
              Y.Assert.areEqual("foo set", args.result, "Expected 'foo set'.");
            });
            test.wait(2000);
          },

          testGetSessionFoo: function () {
            var test = this;
            me.server_getSessionFoo(function(args) {
              test.resume();
              Y.Assert.areEqual("server foo", args.result, "Expected 'server foo'.");
            });
            test.wait(2000);
          }  
        }));

        Y.Test.Runner.add(suite);
      }
    }
  });
})();