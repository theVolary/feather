feather.ns("api_tester");
(function() {
  api_tester.qsTest = feather.Widget.create({
    name: "api_tester.qsTest",
    path: "widgets/qsTest/",
    prototype: {
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Client side querystring parsing");

        suite.add(new Y.Test.Case({
          name: "Test querystring parsing",

          setUp: feather.emptyFn,

          tearDown : feather.emptyFn,

          testQS: function () {
            //simple tests...
            Y.Assert.areEqual('bar', feather.util.qs.foo, 'make sure you have the correct querystring (requires navigating here _with_ the querystring in place)');
            Y.Assert.areEqual('123', feather.util.qs.baz, 'make sure you have the correct querystring (requires navigating here _with_ the querystring in place)');
          }
        }));

        Y.Test.Runner.add(suite);
      }
    }
  });
})();