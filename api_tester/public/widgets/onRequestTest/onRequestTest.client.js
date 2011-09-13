feather.ns("api_tester");
(function() {
  api_tester.onRequestTest = feather.Widget.create({
    name: "api_tester.onRequestTest",
    path: "widgets/onRequestTest/",
    prototype: {
      onInit: function() {
        
      },
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("onRequest");

        suite.add(new Y.Test.Case({
          name: "onRequest - is foo here?",
          setUp: feather.emptyFn,
          tearDown : feather.emptyFn,

          testFooHere: function () {
            Y.Assert.areEqual("bar", me.foo);
          }
        }));

        Y.Test.Runner.add(suite);
      },
      onRequest: function(foo) {
        this.foo = foo;
      }
    }
  });
})();