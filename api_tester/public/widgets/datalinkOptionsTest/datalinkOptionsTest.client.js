feather.ns("api_tester");
(function() {
  api_tester.datalinkOptionsTest = feather.widget.create({
    name: "api_tester.datalinkOptionsTest",
    path: "widgets/datalinkOptionsTest/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      },
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Datalink Options Tests");

        suite.add(new Y.Test.Case({
          name: "Convert foo field to be hardcoded value",
          setUp: feather.emptyFn,
          tearDown : function(){
            me.datalink1 && me.datalink1.dispose();
          },

          testSetSessionFoo: function () {
            var test = this;
            feather.widget.load({
              path: "widgets/datalink1/",
              parent: me,
              clientOptions: {
                on: {
                  ready: function(args) {
                    me.datalink1 = args.sender;
                  }
                },
                datalinkOptions: {
                  foo: {
                    convert: function(value, source, target) {
                      target.foo = "bar";
                    }
                  }
                },
                containerOptions: {
                  title: "Enter text and then click 'DONE' button",
                  width: 500,
                  height: 300,
                  buttons: {
                    DONE: function() {
                      test.resume(function() {
                        Y.Assert.areEqual(me.datalink1.model.test.foo, "bar");                        
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