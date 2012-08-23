feather.ns("api_tester");
(function() {
  api_tester.asyncRenderTest = feather.Widget.create({
    name: "api_tester.asyncRenderTest",
    path: "widgets/asyncRenderTest/",
    prototype: {
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Asyncronous rendering test");

        suite.add(new Y.Test.Case({
          name: "Async rendering",
          setUp: feather.emptyFn,
          tearDown : feather.emptyFn,

          testAsyncRendering: function () {
            var test = this;
            
            feather.Widget.load({
              path: "widgets/asyncRenderTest/",
              clientOptions: {
                containerOptions: {
                  title: "testing async render"
                },
                onceState: {
                  ready: function() {
                    var widget = this;
                    test.resume(function() {
                      Y.Assert.areEqual("content", widget.get('#foo').html());
                      widget.dispose();
                    });
                  }
                }
              }
            });

            test.wait(2000);
          }
        }));

        Y.Test.Runner.add(suite);
      }
    }
  });
})();