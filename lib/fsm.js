var sys = require("sys");
exports.init = function(appOptions) {
    /**
     * @namespace Root namespace for Finite State Machine class definitions and services
     * @name feather.fsm
     */
    feather.ns("feather.fsm");
    
    /*
     * note: an execution scope is required due to js lack of block level scoping in for..in loops (in anything else for that matter, too)
     * (otherwise a simple single closure would result in erroneous values for eventName at time of calling)
     * it's more efficient to define once here vs. anonymous closure in loop body (including calling .bind(this) which is way overused by people)
     * @param {Object} fsm The feather.fsm.FiniteStateMachine instance being wired
     * @param {Object} eventName The name of the event being wired
     */
    var wireEvent = function(fsm, eventName) { 
      if (!fsm.wiredEvents[eventName]) {
        fsm.on(eventName, function(args) {
          fsm.fsmEvent(eventName, args);
        });
        fsm.wiredEvents[eventName] = true;
      }
    };
    
    /**
     * Definition of finite state machine class for the framework
     * 
     * @class
     * @name feather.fsm.finiteStateMachine
     * @extends feather.event.eventPublisher
     */
    feather.fsm.finiteStateMachine = Class.create(feather.event.eventPublisher, /** @lends feather.fsm.finiteStateMachine.prototype */ {
      /**
       * @constructs
       * @param {Object} $super
       * @param {Object} options
       */
      initialize: function($super, options) {            
        //super class instantiation
        $super(options);
        
        //if no initial state is defined, add an empty one
        options = options || {};
        options.states = options.states || this.states || {
          initial: {}
        };
        //make sure there is a global state def present, and auto-wire it to respond to all "error" events by going to the "error" state if present
        options.states.global = options.states.global || {};
        options.states.global.error = options.states.global.error || feather.fsm.gotoErrorState;
        
        //wire up state transitions for any event handlers found in each state
        this.states = options.states;
        this.wiredEvents = {};
        for (var state in this.states) {
          for (var eventName in this.states[state]) {
            wireEvent(this, eventName);
          }
        }
        
        //allow passing "onState" and "onceState" event handlers in the constructor:
        if (options.onState) {
          for (var onstate in options.onState) {
            this.onState(onstate, options.onState[onstate]);
          }
        }
        if (options.onceState) {
          for (var oncestate in options.onceState) {
            this.onceState(oncestate, options.onceState[oncestate]);
          }
        }
        
        //set initial state
        this.gotoState(this.states.initial, "init", {
          options: options
        });
      },
      
      /**
       * 
       * @param {String} eventName
       * @param {Object} args
       */
      fsmEvent: function(eventName, args) {            
        if (this.currentState[eventName] || this.states.global[eventName]) {
          var newState;
          if (typeof this.states.global[eventName] === "function") {
            newState = this.states.global[eventName](this, args);
          }
          if (typeof this.currentState[eventName] === "function") {
            var _newState = this.currentState[eventName](this, args); //pass the instance explicitly which allows unbound state definitions
            if (_newState) {
                newState = _newState; //allows local state transitions to override global
            }
          } 
          if (newState && newState !== this.currentState) {
            //allow the state to clean things up if needed before entering the new state...
            //NOTE: if the "leavingState" transition function returns a new state, it
            //will result in 2 state changes right away... the state returned from the 
            //"leavingState" function will execute its stateStartup function, and then
            //the original new state (that triggered the "leavingState" function) will be transitioned. 
            //Then things could get really interesting if that transitory state also defines a "leavingState" transition
            //handler and returns yet another state (etc...). For that reason, it is probably
            //usually better to not return anything from the "leavingState" function and just do the cleanup stuff needed
            this.fire("leavingState", {currentState: this.currentState, newState: newState, eventName: eventName, eventArgs: args});
            this.gotoState(newState, eventName, args);                    
          }
        }
      },
      /**
       * Go immediately to the given state.
       * @param {String} state
       * @param {String} eventName
       * @param {Object} eventArgs
       */
      gotoState: function(state, eventName, eventArgs) {
        this.previousState = this.currentState;
        this.currentState = state;
        //fire stateStartup event, passing event data that caused the state transition in case some listeners are interested in that info
        //NOTE: this event can then be defined on each state to perform state startup code
        //ex.:
        //    states = {
        //        initial: {
        //            stateStartup: function(args) {
        //                doSomething();
        //            }
        //        }
        //    };
        eventArgs = eventArgs || {};
        eventArgs.eventName = eventName;
        this.fire("stateStartup", eventArgs);
      },
      
      /**
       * Execute the callback when the fsm enters the given state
       * @param {String} state
       * @param {Function} callback
       * @param {boolean} once if true, only do this once
       */
      onState: function(state, callback, once) {
        var me = this;
        if (typeof state === "string") {
          state = this.states[state];
        }
        //if we're already in the desired state, execute callback immediately
        if (me.currentState === state && callback) {
          callback();
        } else  {
          var onStateHandler = function() {
            if (me.currentState === state && callback) {
              callback();
              if (once) {
                me.removeListener('stateStartup', onStateHandler);
              }
            }
          };
          this.on("stateStartup", onStateHandler);
        }
      },
      
      /**
       * Execute the callback the next time the fsm enters the given state.  This is identical to fsm.onState(state, callback, true);
       * @param {String} state
       * @param {Function} callback
       */
      onceState: function(state, callback) {
        this.onState(state, callback, true);
      },
      
      /**
       * Retrieves the current state name for the fsm.
       * @returns {String} the current state's name.
       */
      getCurrentStateName: function() {
        for (var p in this.states) {
          if (this.states[p] === this.currentState) {
            return p;
          }
        }
      },
      
      /**
       * 
       * @param {Object} $super
       */
      dispose: function($super) {
        //TODO: what does this class need to dispose of?
        $super();
      }
    });
    
    /**
     * A static flyweight state transition function for returning to the original state of the FSM instance
     * @param {Object} fsm
     * @param {Object} args
     */
    feather.fsm.gotoInitialState = function(fsm, args) {
      return fsm.states.initial;
    };
    
    /**
     * A static flyweight state transition function for going to an error state
     * @param {Object} fsm
     * @param {Object} args
     */
    feather.fsm.gotoErrorState = function(fsm, args) {
      return fsm.states.error;
    };
    
    /**
     * A static flyweight state transition function for going to the previous state
     * @param {Object} fsm
     * @param {Object} args
     */
    feather.fsm.gotoPreviousState = function(fsm, args) {
      return fsm.previousState;
    };
    
    /**
     * A static flyweight empty state (just an alias for feather.emptyObj)
     * note: using this alias in case feather.fsm.emptyState ever needs to be more than an empty object
     */
    feather.fsm.emptyState = feather.emptyObj;
    
    var states = {
      initial: {
        stateStartup: function(fsm, args) {
            //go right to the "loading state" since that is exactly what we're doing at the time this instance is created
            return fsm.states.loading;
        }
      },
      loading: {
        loadingComplete: function(fsm, args) {
          //once everything is loaded, go to the ready state
          return fsm.states.loadingComplete;
        }
      },
      loadingComplete: {
        startup: function(fsm, args) {
          // Run one-time startup function if it exists.
          if (feather.appOptions.onStartup && typeof(feather.appOptions.onStartup) === "function") {
            feather.appOptions.onStartup();
          }
        },
        ready: function(fsm, args) {
          // Before moving to the ready state, add a hook for clean shutdown to the process itself.
          process.on('SIGINT', function() {
            feather.shutdown();
          });
          process.on('SIGTERM', function() {
            feather.shutdown();
          });
          return fsm.states.ready;
        }
      },
      ready: feather.fsm.emptyState
    };
    if (appOptions.states) {
      Object.extend(states, appOptions.states);
    }
    
    /**
     * A global framework fsm that other objects can use to take certain actions at the correct time in the framework's lifecycle...
     * For instance, if you have a bit of code that you only want to execute when the framework is in the ready state
     * instead of while the framework is still loading.  This is an instance of {@link feather.fsm.finiteStateMachine}.
     * @name feather.stateMachine
     */
    feather.stateMachine = new feather.fsm.finiteStateMachine({
      states: states
    });
    
    if (appOptions.fsmListeners && appOptions.fsmListeners.length > 0) {
      appOptions.fsmListeners.forEach(function(l) {
        feather.stateMachine.on(l.eventName, l.fn);
      });
    }
};
