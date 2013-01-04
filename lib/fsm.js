var util = require("util"),
    EventPublisher = require("./event-publisher"),
    _ = require("underscore")._,
    inherits = require("inherits"),
    slice = Array.prototype.slice;

module.exports = FiniteStateMachine;

/*
 * note: an execution scope is required due to js lack of block level scoping in for..in loops (in anything else for that matter, too)
 * (otherwise a simple single closure would result in erroneous values for eventName at time of calling)
 * it's more efficient to define once here vs. anonymous closure in loop body (including calling .bind(this) which is way overused by people)
 * @param {Object} fsm The FiniteStateMachine instance being wired
 * @param {Object} eventName The name of the event being wired
 */
var wireEvent = function(fsm, eventName) { 
  if (!fsm.wiredEvents[eventName]) {
    fsm.on(eventName, function() {
      fsm.fsmEvent.apply(fsm, [eventName].concat(slice.call(arguments)));
    });
    fsm.wiredEvents[eventName] = true;
  }
};

/**
 * @class FiniteStateMachine allows composing complex stateful behavior using a concise
 * and easy to understand model. This is a work horse tool that can be used for many
 * problems from async flow control to UI management. The beauty of FSM is how easily 
 * a given model can be changed to accomodate new behaviors or rules, and it is always
 * very easy to see just how a given FSM is wired.
 * 
 * @extends EventPublisher
 */
function FiniteStateMachine(options) {
  FiniteStateMachine.super.apply(this, arguments);

  //if no initial state is defined, add an empty one
  options = options || {};
  options.states = options.states || this.states || {};
  //make sure an initial state is present
  options.states.initial = options.states.initial || FiniteStateMachine.emptyState;
  //make sure there is a global state def present, and auto-wire it to respond to all "error" events by going to the "error" state if present
  options.states.global = options.states.global || FiniteStateMachine.emptyState;
  options.states.global.error = options.states.global.error || FiniteStateMachine.gotoErrorState;
  //make sure an error state is present
  options.states.error = options.states.error || FiniteStateMachine.emptyState;
  
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
};

/**
 * @param {String} eventName
 */
FiniteStateMachine.prototype.fsmEvent = function(eventName) {    
  var args = slice.call(arguments, 1);        
  if (this.currentState[eventName] || this.states.global[eventName]) {
    var newState;
    if (typeof this.states.global[eventName] === "function") {
      newState = this.states.global[eventName].apply(this, args);
    }
    if (typeof this.currentState[eventName] === "function") {
      var _newState = this.currentState[eventName].apply(this, args); //pass the instance explicitly which allows unbound state definitions
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
};

/**
 * Go immediately to the given state.
 * @param {String} state
 * @param {String} eventName
 * @param {Object} eventArgs
 */
FiniteStateMachine.prototype.gotoState = function(state, eventName, eventArgs) {
  if (typeof state === "string") {
    state = this.states[state];
  }
  var stateName = this.getStateName(state);
  this.previousState = this.currentState;
  this.currentState = state;
  eventArgs = eventArgs || {};
  eventArgs.eventName = eventName;
  this.fire.apply(this, ["stateStartup"].concat(eventArgs));
  //sanity check in case previous event caused disposal
  this.fire &&
    this.fire.apply(this, ["stateStartup:" + stateName].concat(eventArgs));
};

/**
 * Execute the callback when the fsm enters the given state
 * @param {String} state
 * @param {Function} callback
 * @param {boolean} once if true, only do this once
 */
FiniteStateMachine.prototype.onState = function(state, callback, once) {
  var me = this;
  if (typeof state === "string") {
    state = this.states[state];
  }
  var stateName = this.getStateName(state);
  //if we're already in the desired state, execute callback immediately
  var immediate = false;
  if (me.currentState === state && callback) {
    callback.apply(this);
    immediate = true;
  } 
  if (!once || !immediate) {
    var onStateHandler = function() {
      if (me.currentState === state && callback) {
        callback.apply(me, arguments);
        if (once) {
          me.removeListener("stateStartup:" + stateName, onStateHandler);
        }
      }
    };
    this.on("stateStartup:" + stateName, onStateHandler);
  }
};

/**
 * Execute the callback the next time the fsm enters the given state.  This is identical to fsm.onState(state, callback, true);
 * @param {String} state
 * @param {Function} callback
 */
FiniteStateMachine.prototype.onceState = function(state, callback) {
  this.onState(state, callback, true);
};

/**
 * Retrieves the state name for a given state reference within the fsm.
 * Returns null if the state does not exist within the fsm.
 * @returns {String} the current state's name.
 */
FiniteStateMachine.prototype.getStateName = function(stateRef) {
  for (var p in this.states) {
    if (this.states[p] === stateRef) {
      return p;
    }
  }
  return null;
};

/**
 * Retrieves the current state name for the fsm.
 * @returns {String} the current state's name.
 */
FiniteStateMachine.prototype.getCurrentStateName = function() {
  return this.getStateName(this.currentState);
};

/**
 * A static flyweight state transition function for returning to the original state of the FSM instance
 */
FiniteStateMachine.gotoInitialState = function() {
  return this.states.initial;
};

/**
 * A static flyweight state transition function for going to an error state
 */
FiniteStateMachine.gotoErrorState = function() {
  return this.states.error;
};

/**
 * A static flyweight state transition function for going to the previous state
 */
FiniteStateMachine.gotoPreviousState = function() {
  return this.previousState;
};

/**
 * A static flyweight empty state
 */
FiniteStateMachine.emptyState = {};


inherits(FiniteStateMachine, EventPublisher);