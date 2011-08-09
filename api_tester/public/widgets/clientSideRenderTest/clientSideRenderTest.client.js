feather.ns("api_tester");
(function() {
  api_tester.clientSideRenderTest = feather.Widget.create({
    name: "api_tester.clientSideRenderTest",
    path: "widgets/clientSideRenderTest/",
    prototype: {
      onInit: function() {
        
      },
      onReady: function() {
        
      },
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Client Side Rendering Tests");

        suite.add(new Y.Test.Case({
          name: "Conduct Various tests with a client-side rendered widget",
          setUp: feather.emptyFn,
          tearDown : function() {
            me.widget && me.widget.dispose();
          },

          testClientSideRendering1: function () {
            var test = this;
            feather.Widget.load({
              path: "widgets/clientSideRender/",
              parent: me,
              clientOptions: {
                title: "FooBar",
                on: {
                  ready: function(sender) {
                    me.widget = sender;
                  }
                },
                containerOptions: {
                  title: "Client Side Rendering Tests",
                  width: 700,
                  height: 600,
                  buttons: {
                    DONE: function() {
                      test.resume(function() {
                        //assert?
                      });
                    }
                  }
                }
              }
            });
            test.wait();
          }
        }));

        Y.Test.Runner.add(suite);
      }
    }
  });
})();