feather.ns("api_tester");
(function() {
  api_tester.ajaxErrorsTest = feather.Widget.create({
    name: "api_tester.ajaxErrorsTest",
    path: "widgets/ajaxErrorsTest/",
    prototype: {
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("AJAX errors");

        suite.add(new Y.Test.Case({
          name: "test an uncaught exception via ajaxProxy",

          setUp: feather.emptyFn,

          tearDown : function(){

          },

          testUncaughtException: function () {
            var test = this;

            me.server_causeException([], function(args) {
              test.resume(function() {
                Y.Assert.areEqual(false, args.success);
              });
            });

            test.wait();
          }
        }));

        Y.Test.Runner.add(suite);
      }
    }
  });
})();