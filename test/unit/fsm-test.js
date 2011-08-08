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
          stateStartup: function() {
            
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
        testObjectPassed: {
          stateStartup: function() {}
        },
        testStringPassed: {
          stateStartup: function() {}
        }
      });
 
      fsm.gotoState(fsm.states.testObjectPassed);
      Y.Assert.areEqual("testObjectPassed", fsm.getCurrentStateName(), "FSM is not in testObjectPassed state.");

      fsm.gotoState("testStringPassed");
      Y.Assert.areEqual("testStringPassed", fsm.getCurrentStateName(), "FSM is not in testStringPassed state.");
    },

    testOnState: function() {
      var fsm = this.getFsm({
        initial: {
          gotoReady: function() {
            return fsm.states.ready;
          }
        },
        ready: {}
      });
      
      var x = 0;
      var listener = function() { x += 1; };
      fsm.onState('ready', listener, false);
      fsm.fire("gotoReady");
      Y.Assert.areEqual(1, x, "X should have been set to 1 on ready.");
      fsm.gotoState(fsm.states.initial);
      fsm.fire("gotoReady");
      Y.Assert.areEqual(2, x, "X should have been set to 2 on 2nd ready.");      
    },

    testOnceState: function() {
      var i = 0;
      var fsm = this.getFsm({
        initial: {
          stateStartup: function() {
            i++;
          },
          gotoReady: function() {
            return fsm.states.ready;
          }
        },
        ready: {}
      });
      Y.Assert.areEqual(1, i, "i should have been set to 1 on fsm contruction");
      var x = 0;
      var y = 0;
      var listener1 = function() { x += 1; };
      var listener2 = function() { y += 1; };
      fsm.onceState("ready", listener1);
      fsm.onceState("ready", listener2);
      fsm.fire("gotoReady");
      Y.Assert.areEqual(1, x, "x should have been set to 1 on ready");
      Y.Assert.areEqual(1, y, "y should have been set to 1 on ready");
      fsm.gotoState(fsm.states.initial);
      Y.Assert.areEqual(2, i, "i should have been set to 2 when fsm sent back to initial state");
      fsm.fire("gotoReady");
      Y.Assert.areEqual(1, x, "x should still be set to 1 on 2nd ready.");
      Y.Assert.areEqual(1, y, "y should still be set to 1 on 2nd ready.");
    },

    testDispose: function() {
      var fsm = new FSM({});
      fsm.onState("initial", function() {});
      fsm.dispose();
      Y.Assert.isNull(fsm.listeners, "The listeners array should have been null by now.");
      // TODO: Other assertions to verify disposal?
    },

    testGotoInitialState: function() {
      var counter = 0;
      var fsm = new FSM({
        states: {
          initial: {
            stateStartup: function() {
              counter++;
            },
            state2: function() {
              return fsm.states.state2;
            }
          },
          state2: {
            goback: FSM.gotoInitialState
          }
        }
      });
      Y.Assert.areEqual(1, counter);
      Y.Assert.areSame(fsm.states.initial, fsm.currentState, "currentState should be initial");

      fsm.fire("state2");
      Y.Assert.areSame(fsm.states.state2, fsm.currentState, "currentState should be state2");

      fsm.fire("goback");
      Y.Assert.areEqual(2, counter);
      Y.Assert.areSame(fsm.states.initial, fsm.currentState, "currentState should be initial");
    },

    testGotoErrorStateExplicitly: function() {
      var counter = 0;
      var fsm = new FSM({
        states: {
          initial: {
            error_occured: FSM.gotoErrorState
          },
          error: {
            stateStartup: function() {
              counter++;
            }
          }
        }
      });
      Y.Assert.areEqual(0, counter);
      Y.Assert.areSame(fsm.states.initial, fsm.currentState, "currentState should be initial");

      fsm.fire("error_occured");
      Y.Assert.areEqual(1, counter);
      Y.Assert.areSame(fsm.states.error, fsm.currentState, "currentState should be error");
    },

    testGotoErrorStateImplicitly: function() {
      var counter = 0;
      var fsm = new FSM({
        states: {
          error: {
            stateStartup: function() {
              counter++;
            }
          }
        }
      });
      Y.Assert.areEqual(0, counter);
      Y.Assert.areSame(fsm.states.initial, fsm.currentState, "currentState should be initial");

      fsm.fire("error");
      Y.Assert.areEqual(1, counter);
      Y.Assert.areSame(fsm.states.error, fsm.currentState, "currentState should be error");
    },

    testGotoErrorStateImplicitly2: function() {
      var fsm = new FSM();
      Y.Assert.areSame(fsm.states.initial, fsm.currentState, "currentState should be initial");

      fsm.fire("error");
      Y.Assert.areSame(fsm.states.error, fsm.currentState, "currentState should be error");
    },

    testStateTransitionArguments: function() {
      var fsm = new FSM({
        states: {
          initial: {
            gotoState2: function() {
              return fsm.states.state2;
            }
          },
          state2: {
            stateStartup: function(arg1, arg2, sender) {
              Y.Assert.areSame(this, fsm, "this should be the FSM instance inside state event handlers");
              Y.Assert.areSame(this, sender, "last arg should be sender");
              Y.Assert.areSame("hello", arg1);
              Y.Assert.areSame("world", arg2);
            },
            gotoState3: function() {
              return fsm.states.state3;
            }
          },
          state3: {
            stateStartup: function(sender) {
              Y.Assert.areSame(this, fsm, "this should be the FSM instance inside state event handlers");
              Y.Assert.areSame(this, sender, "last arg should be sender");              
            }
          }
        }
      });
      fsm.fire("gotoState2", "hello", "world");
      Y.Assert.areSame(fsm.states.state2, fsm.currentState, "fsm should be in state2");
      fsm.fire("gotoState3");
      Y.Assert.areSame(fsm.states.state3, fsm.currentState, "fsm should be in state3");
    }

  });

  Y.TestRunner.add(tc);
})();