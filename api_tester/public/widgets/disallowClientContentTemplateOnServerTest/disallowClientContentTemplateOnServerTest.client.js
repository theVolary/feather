feather.ns("api_tester");
(function() {
  api_tester.disallowClientContentTemplateOnServerTest = feather.Widget.create({
    name: "api_tester.disallowClientContentTemplateOnServerTest",
    path: "widgets/disallowClientContentTemplateOnServerTest/",
    prototype: {
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Widget.load");

        suite.add(new Y.Test.Case({
          name: "disallow contentTemplate",
          setUp: feather.emptyFn,
          tearDown : function(){
            
          },

          testDisallowContentTemplate: function () {
            var test = this;
            
            feather.Widget.load({
              path: 'widgets/embeddedWidget/',

              serverOptions: {
                content: [
                  '<b>this should not be allowed</b>'
                ].join('')
              },

              clientOptions: {
                containerOptions: {
                  title: 'testing...'
                },

                onceState: {
                  ready: function() {
                    var content = this.get('#Container').html();

                    test.resume(function() {
                      Y.Assert.areEqual('', content, "Embedded widget should not have any content");
                    });                    
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