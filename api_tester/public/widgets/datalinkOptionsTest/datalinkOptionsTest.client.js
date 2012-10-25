feather.ns("api_tester");
(function() {
  api_tester.datalinkOptionsTest = feather.Widget.create({
    name: "api_tester.datalinkOptionsTest",
    path: "widgets/datalinkOptionsTest/",
    prototype: {
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Datalink Options Tests");

        suite.add(new Y.Test.Case({
          name: "Convert foo field to be hardcoded value",
          setUp: feather.emptyFn,
          tearDown : function(){
            me.datalink1 && me.datalink1.dispose();
          },

          testDatalinkOptions: function () {
            var test = this;
            feather.Widget.load({
              path: "widgets/datalink1/",
              parent: me,
              clientOptions: {
                on: {
                  ready: function(sender) {
                    me.datalink1 = sender;
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
                  title: "Enter text in the textbox and then click 'DONE' button",
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

        suite.add(new Y.Test.Case({
          name: "Test checkbox changes to model",
          setUp: feather.emptyFn,
          tearDown : function(){
            me.datalink1 && me.datalink1.dispose();
          },

          testCheckboxClickChangesModel: function () {
            var test = this;
            feather.Widget.load({
              path: "widgets/datalink1/",
              parent: me,
              clientOptions: {
                on: {
                  ready: function(sender) {
                    me.datalink1 = sender;
                  }
                },
                containerOptions: {
                  title: "Check the checkbox and then click 'DONE' button",
                  width: 500,
                  height: 300,
                  buttons: {
                    DONE: function() {
                      test.resume(function() {
                        Y.Assert.areEqual(me.datalink1.model.test.bool, true);                        
                      });
                    }
                  }
                }
              }
            });
            test.wait();
          }
        }));

        suite.add(new Y.Test.Case({
          name: "Test radio changes to model",
          setUp: feather.emptyFn,
          tearDown : function(){
            me.datalink1 && me.datalink1.dispose();
          },

          testRadioClickChangesModel: function () {
            var test = this;
            feather.Widget.load({
              path: "widgets/datalink1/",
              parent: me,
              clientOptions: {
                on: {
                  ready: function(sender) {
                    me.datalink1 = sender;
                  }
                },
                containerOptions: {
                  title: "Check the radio for '1' and then click 'DONE' button",
                  width: 500,
                  height: 300,
                  buttons: {
                    DONE: function() {
                      test.resume(function() {
                        Y.Assert.areEqual(me.datalink1.model.test.radio, '1');                        
                      });
                    }
                  }
                }
              }
            });
            test.wait();
          }
        }));

        suite.add(new Y.Test.Case({
          name: "Test select changes to model",
          setUp: feather.emptyFn,
          tearDown : function(){
            me.datalink1 && me.datalink1.dispose();
          },

          testSelectChangesModel: function () {
            var test = this;
            feather.Widget.load({
              path: "widgets/datalink1/",
              parent: me,
              clientOptions: {
                on: {
                  ready: function(sender) {
                    me.datalink1 = sender;
                  }
                },
                containerOptions: {
                  title: "Choose '2' from the select dropdown and then click 'DONE' button",
                  width: 500,
                  height: 300,
                  buttons: {
                    DONE: function() {
                      test.resume(function() {
                        Y.Assert.areEqual(me.datalink1.model.test.select, '2');                        
                      });
                    }
                  }
                }
              }
            });
            test.wait();
          }
        }));

        suite.add(new Y.Test.Case({
          name: "Test fields when model is known at render time",
          setUp: feather.emptyFn,
          tearDown : function(){
            me.datalink1 && me.datalink1.dispose();
          },

          testFieldsAtRenderTime: function () {
            var test = this;
            feather.Widget.load({
              path: "widgets/datalink1/",
              parent: me,
              clientOptions: {
                onceState: {
                  ready: function() {
                    me.datalink1 = this;
                    test.resume(function() {
                      //test the textbox
                      Y.Assert.areEqual('bar', me.datalink1.get('[name=foo]').val()); 
                      //test the checkbox
                      Y.Assert.areEqual('checked', me.datalink1.get('[name=bool]').attr('checked'));    
                      //test the radio
                      Y.Assert.areEqual('checked', me.datalink1.get('#radio1').attr('checked'));      
                      //test the select
                      Y.Assert.areEqual('2', me.datalink1.get('select').val());                        
                    });
                  }
                },
                model: {
                  test: {
                    foo: 'bar',
                    bool: true,
                    radio: '1',
                    select: '2'
                  }
                },
                containerOptions: {
                  title: "testing fields",
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