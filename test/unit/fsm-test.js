(function() {
  var Y = this.YUITest || require("yuitest"),
  util = require("util"),
  FSM = require("../../lib/fsm"),
  _ = require("underscore")._;

  var tc = new Y.TestCase({
    name:"FSM Tests",

    setUp: function() {
      this.defaultStates = {
        initial: {
          stateStartup: function(fsm, args) {
            
          }
        }
      };
    },
    tearDown: function() {
      delete this.defaultStates;
    },

    getFsm: function(customStates) {
      return new FSM({
        states: _.extend(this.defaultStates, customStates)
      });
    },

    testInitialState: function() {
      var fsm = new FSM({});
      Y.Assert.areEqual("initial", fsm.getCurrentStateName(), "FSM is not in initial state.");
    },

    testGotoState: function() {
      var fsm = this.getFsm({
        testPassed: {
            stateStartup: function(fsm, args) {}
        }
      });

      fsm.gotoState(fsm.states.testPassed);
      this.wait(function() {
        Y.Assert.areEqual("testPassed", fsm.getCurrentStateName(), "FSM is not in testPassed state.");
      }, 50);
    },

    testOnState: function() {
      var fsm = this.getFsm({
        initial: {
          gotoReady: function(fsm, args) {
            return fsm.states.ready;
          }
        },
        ready: {}
      });
      
      var x = 0;
      var listener = function() { x += 1; };
      fsm.onState('ready', listener, false);
      fsm.fire("gotoReady");
      this.wait(function() {
        Y.Assert.areEqual(1, x, "X should have been set to 1 on ready.");
        
        fsm.gotoState(fsm.states.initial);
        this.wait(function() {
          fsm.fire("gotoReady");
          this.wait(function() {
            Y.Assert.areEqual(2, x, "X should have been set to 2 on 2nd ready.");
          }, 50);
        }, 50);

      }, 50);
      
    },

    testOnceState: function() {
      var fsm = this.getFsm({
        initial: {
          gotoReady: function(fsm, args) {
            return fsm.states.ready;
          }
        },
        ready: {}
      });

      var x = 0;
      var listener = function() { x += 1; };
      fsm.onceState("ready", listener);
      fsm.fire("gotoReady");
      this.wait(function() {
        Y.Assert.areEqual(1, x, "X should have been set to 1 on ready");
        fsm.gotoState(fsm.states.initial);
        this.wait(function() {
          fsm.fire("gotoReady");
          this.wait(function() {
            Y.Assert.areEqual(1, x, "X should still be set to 1 on 2nd ready.");
          })
        }, 50);
      }, 50);
    },

    testDispose: function() {
      var fsm = new FSM({});
      fsm.onState("initial", function() {});
      fsm.dispose();
      Y.Assert.isNull(fsm.listeners('stateStartup'), "The listeners array should have been null by now.");
      // TODO: Other assertions to verify disposal?
    }

  });

  Y.TestRunner.add(tc);
})();