feather.ns("api_tester");
(function() {
  api_tester.testPicker = feather.widget.create({
    name: "api_tester.testPicker",
    path: "widgets/testPicker/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      },
      onReady: function() {
        var me = this;

        this.bindUI();
        this.setupYUI();

        //tiny fsm to track YUI ready state
        this.YUIFSM = new feather.fsm.finiteStateMachine({
          states: {
            initial: {
              ready: function(fsm) {
                return fsm.states.ready;
              }
            },
            ready: feather.fsm.emptyState
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
            yconsole.render(me.get("#console")[0]);
        });
      },
      runTests: function() {
        var me = this;
        var tests = [];
        me.get(".testCB").each(function(i, el) {
          
        });
        me.YUIFSM.onceState("ready", function() {
          
        });
      }
    }
  });
})();