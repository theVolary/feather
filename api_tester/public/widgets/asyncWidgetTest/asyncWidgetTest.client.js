feather.ns("api_tester");
(function() {

  api_tester.asyncWidgetTest = feather.widget.create({
    name: "api_tester.asyncWidgetTest",
    path: "widgets/asyncWidgetTest/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      },
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Async Widget Definitions");

        suite.add(new Y.Test.Case({
          name: "load a widget whose definition is async on the server",

          setUp: feather.emptyFn,
          tearDown : feather.emptyFn,

          testAsynWidget: function () {
            debugger;
            Y.Assert.areEqual(me.asyncWidget.foo, "bar");
          }
        }));

        Y.Test.Runner.add(suite);
      }
    }
  });
})();