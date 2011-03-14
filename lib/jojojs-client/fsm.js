(function() { //module pattern for client-safety, as this code could run on either the client or the server
  
    /**
     * Root namespace for Finite State Machine class definitions and services
     */
    jojo.ns("jojo.fsm");
    
    /**
     * note: an execution scope is required due to js lack of block level scoping in for..in loops (in anything else for that matter, too)
     * (otherwise a simple single closure would result in erroneous values for eventName at time of calling)
     * it's more efficient to define once here vs. anonymous closure in loop body (including calling .bind(this) which is way overused by people)
     * @param {Object} fsm The jojo.fsm.FiniteStateMachine instance being wired
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
    
    jojo.fsm.finiteStateMachine = Class.create(jojo.event.eventPublisher, {
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
        options.states.global.error = options.states.global.error || jojo.fsm.gotoErrorState;
        
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
      onState: function(state, callback, once) {
        var me = this;
        if (typeof state === "string") {
          state = this.states[state];
        }
        //if we're already in the desired state, execute callback immediately
        if (me.currentState === state && callback) {
          callback();
        } else  {
          var ranOnce = false;
          this.on("stateStartup", function() {
            if (me.currentState === state && callback &&
                (!once || !ranOnce)) {
              callback();
              ranOnce = true;
            }
          });
        }
      },
      onceState: function(state, callback) {
        this.onState(state, callback, true);
      },
      getCurrentStateName: function() {
        for (var p in this.states) {
          if (this.states[p] === this.currentState) {
            return p;
          }
        }
      },
      toJSON: function() {
        //serialize to JSON to get rid of functions, etc...
        var json = Object.toJSON(this);
        //deserialize to get a clone
        json = json.evalJSON();
        //remove the states
        delete json.states;
        //spit out the rest as JSON string
        return Object.toJSON(json);
      },
      dispose: function($super) {
        //TODO: what does this class need to dispose of?
        $super();
      }
    });
    
    /**
     * A static flyweight state transition function for returning to the original state of the FSM instance
     */
    jojo.fsm.gotoInitialState = function(fsm, args) {
      return fsm.states.initial;
    };
    
    /**
     * A static flyweight state transition function for going to an error state
     */
    jojo.fsm.gotoErrorState = function(fsm, args) {
      return fsm.states.error;
    };
    
    /**
     * A static flyweight state transition function for going to the previous state
     */
    jojo.fsm.gotoPreviousState = function(fsm, args) {
      return fsm.previousState;
    };
    
    /**
     * A static flyweight empty state (just an alias for jojo.emptyObj)
     * note: using this alias in case jojo.fsm.emptyState ever needs to be more than an empty object
     */
    jojo.fsm.emptyState = jojo.emptyObj;
    
    /**
     * A global framework fsm that other objects can use to take certain actions at the correct time in the framework's lifecycle...
     * For instance, if you have a bit of code that you only want to execute when the framework is in the ready state
     * instead of while the framework is still loading.
     */
    var states = {
      initial: {
        stateStartup: function(fsm, args) {
            //go right to the "loading state" since that is exactly what we're doing at the time this instance is created
            return fsm.states.loading;
        }
      },
      /**
       * Loading state, the framework is still being bootstrapped
       * @param {Object} fsm
       * @param {Object} args
       */
      loading: {
        loadingComplete: function(fsm, args) {
          //once everything is loaded, go to the ready state
          return fsm.states.loadingComplete;
        }
      },
      /**
       * Transitional state to enable some "pre-ready" logic to be implemented
       * @param {Object} fsm
       * @param {Object} args
       */
      loadingComplete: {
        ready: function(fsm, args) {
          return fsm.states.ready;
        }
      },
      /**
       * The framework is operational now, except for the socket.io connection
       * @param {Object} fsm
       * @param {Object} args
       */
      ready: {
        socketReady: function(fsm, args) {
          return fsm.states.socketReady;
        }
      },
      /**
       * Final bootstrapping state, indicating a successful connection has been made to the socket.io server
       */
      socketReady: jojo.fsm.emptyState
    };
    
    jojo.stateMachine = new jojo.fsm.finiteStateMachine({
      states: states
    });
    
})();
