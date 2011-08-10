feather.ns("api_tester");
(function() {
  api_tester.testPicker = feather.Widget.create({
    name: "api_tester.testPicker",
    path: "widgets/testPicker/",
    prototype: {
      onInit: function() {
        this.testWidgets = [];
      },
      onReady: function() {
        var me = this;
        
        this.bindUI();
        this.setupYUI();

        //tiny fsm to track YUI ready state
        this.YUIFSM = new feather.FiniteStateMachine({
          states: {
            initial: {
              ready: function() {
                return this.states.ready;
              }
            },
            ready: feather.FiniteStateMachine.emptyState
          }
        });
      },
      bindUI: function() {
        var me = this;

        me.domEvents.bind(me.get("#checkAll"), "click", function() {
          var checked = me.get("#checkAll")[0].checked;
          me.get(".testCB").each(function(i, el) {
            el.checked = checked;
          });
        });

        me.domEvents.bind(me.get("#runBtn"), "click", function() {
          me.runTests();
        })
      },
      setupYUI: function() {
        var me = this;
        YUI({ logInclude: { TestRunner: true } }).use("test", "console", function(Y){ 
          window.Y = Y;
          me.YUIFSM.fire("ready");
       
          //initialize the console
          var yconsole = new Y.Console({
            newestOnTop: false                   
          });
          yconsole.render();
        });
      },
      runTests: function() {
        var me = this;
        var tests = [];
        me.get(".testCB").each(function(i, el) {
          if (el.checked) {
            tests.push(_.find(me.tests, function(t) {
              return t.name === el.id;
            }));
          }
        });
        var sem = new feather.Semaphore(function() {
          Y.Test.Runner.run();
        });
        sem.semaphore = tests.length;
        me.YUIFSM.onceState("ready", function() {
          Y.Test.Runner.clear();
          _.each(tests, function(test) {
            var widget = _.find(me.testWidgets, function(w) {
              return w.widgetPath === test.path;
            });
            if (widget) {
              widget.addTests();
              sem.execute();
            } else {
              feather.Widget.load({
                id: feather.id(),
                path: test.path,
                clientOptions: {
                  // containerOptions: {
                  //   containerizer: "empty"
                  // },
                  on: {
                    ready: function(sender) {
                      me.testWidgets.push(sender);
                      sender.addTests();
                      sem.execute();
                    }
                  }
                }
              });
            }
          });
        });
      }
    }
  });
})();