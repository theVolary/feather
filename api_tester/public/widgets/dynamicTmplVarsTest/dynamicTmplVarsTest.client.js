feather.ns("api_tester");
(function() {
  api_tester.dynamicTmplVarsTest = feather.Widget.create({
    name: "api_tester.dynamicTmplVarsTest",
    path: "widgets/dynamicTmplVarsTest/",
    prototype: {
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Dynamic tag with tmpl vars");

        suite.add(new Y.Test.Case({
          name: "test dynamic tag w/ tmpl variables",

          setUp: feather.emptyFn,
          tearDown : function() {
            setTimeout(function() {
              me.dynamicTmplVars && me.dynamicTmplVars.dispose();
            },10);            
          },

          testDynamicTagWithVars: function () {
            var test = this;
            var id = feather.id();
            feather.Widget.load({
              path: "widgets/dynamicTmplVars/",
              parent: me,
              id: id,
              clientOptions: {
                on: {
                  ready: function(sender) {
                    me.dynamicTmplVars = sender;
                    test.resume(function() {
                      Y.Assert.areEqual(me.dynamicTmplVars.get("#testDiv").html(), "foo");
                    });
                  }
                },
                containerOptions: {
                  title: "Dynamic tag with tmpl variables (this will close automatically)",
                  width: 500,
                  height: 300
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