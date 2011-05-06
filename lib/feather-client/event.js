(function() {

    /*
     * Convert array-like object to an Array.
     *
     * node-bench: "16.5 times faster than Array.prototype.slice.call()"
     *
     * @param {Object} obj
     * @return {Array}
     * @private
     */
    function toArray(obj){
      var len = obj.length,
        arr = new Array(len);
      for (var i = 0; i < len; ++i) {
        arr[i] = obj[i];
      }
      return arr;
    }
    
    /*************************************************************************************************************
     * using base functionality from node.js:
     */
    
    /**
     * @class Event emitter class based on that from node.js.
     * @name EventEmitter
     */
    var EventEmitter = function(){};

    var isArray = Array.isArray;

    /**
     * @augments EventEmitter
     * @param {Object} type
     */
    EventEmitter.prototype.emit = function (type) {
      // If there is no 'error' event listener then throw.
      if (type === 'error') {
        if (!this._events || !this._events.error ||
            (isArray(this._events.error) && !this._events.error.length))
        {
          if (arguments[1] instanceof Error) {
            throw arguments[1]; // Unhandled 'error' event
          } else {
            throw new Error("Uncaught, unspecified 'error' event.");
          }
          return false;
        }
      }

      if (!this._events) return false;
      var handler = this._events[type];
      if (!handler) return false;

      if (typeof handler == 'function') {
        if (arguments.length <= 3) {
          // fast case
          handler.call(this, arguments[1], arguments[2]);
        } else {
          // slower
          var args = Array.prototype.slice.call(arguments, 1);
          handler.apply(this, args);
        }
        return true;

      } else if (isArray(handler)) {
        var args = Array.prototype.slice.call(arguments, 1);


        var listeners = handler.slice();
        for (var i = 0, l = listeners.length; i < l; i++) {
          listeners[i].apply(this, args);
        }
        return true;

      } else {
        return false;
      }
    };

    /**
     * @augments EventEmitter
     * @param {Object} type
     * @param {Object} listener
     */
    EventEmitter.prototype.addListener = function (type, listener) {
      if ('function' !== typeof listener) {
        throw new Error('addListener only takes instances of Function');
      }

      if (!this._events) this._events = {};

      // To avoid recursion in the case that type == "newListeners"! Before
      // adding it to the listeners, first emit "newListeners".
      this.emit("newListener", type, listener);

      if (!this._events[type]) {
        // Optimize the case of one listener. Don't need the extra array object.
        this._events[type] = listener;
      } else if (isArray(this._events[type])) {
        // If we've already got an array, just append.
        this._events[type].push(listener);
      } else {
        // Adding the second element, need to change to array.
        this._events[type] = [this._events[type], listener];
      }

      return this;
    };

    /**
     * Alias for {@link EventEmitter#addListener}.
     * @function
     * @param {String} type
     * @param {Object} listener
     * @augments EventEmitter
     */
    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    /**
     * @augments EventEmitter
     * @param {Object} type
     * @param {Object} listener
     */
    EventEmitter.prototype.removeListener = function (type, listener) {
      if ('function' !== typeof listener) {
        throw new Error('removeListener only takes instances of Function');
      }

      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events || !this._events[type]) return this;

      var list = this._events[type];

      if (isArray(list)) {
        var i = list.indexOf(listener);
        if (i < 0) return this;
        list.splice(i, 1);
        if (list.length == 0)
          delete this._events[type];
      } else if (this._events[type] === listener) {
        delete this._events[type];
      }

      return this;
    };

    /**
     * @augments EventEmitter
     * @param {Object} type
     */
    EventEmitter.prototype.removeAllListeners = function (type) {
      // does not use listeners(), so no side effect of creating _events[type]
      if (type && this._events && this._events[type]) this._events[type] = null;
      return this;
    };

    /**
     * @augments EventEmitter
     * @param {Object} type
     */
    EventEmitter.prototype.listeners = function (type) {
      if (!this._events) this._events = {};
      if (!this._events[type]) this._events[type] = [];
      if (!isArray(this._events[type])) {
        this._events[type] = [this._events[type]];
      }
      return this._events[type];
    };
    
    /******************************************************************************************************************
     * now decorate with enhanced functionality...
     */
    
    /**
     * @name EventEmitter.prototype.fire
     * @function
     * @augments EventEmitter
     * @see EventEmitter#emit
     * @param {String} type
     */

    var _emit = EventEmitter.prototype.emit;
    EventEmitter.prototype.emit = EventEmitter.prototype.fire = function (type) {
      if (this._suppressAll
          || (this._suppressOnceEvents && this._suppressOnceEvents[type]) 
          || (this._suppressEvents && this._suppressEvents[type])) {
        
        if (this._suppressOnceEvents) {
          delete this._suppressOnceEvents[type];
        }
        //buffer events for re-emitting later if required
        if (this._bufferedEvents && (this._bufferedEvents[type] || this._bufferAll)) {
          this._buffer.push({type: type, args: toArray(arguments)});
        }
        return false;
      }
      var args = toArray(arguments);
      var arg1 = args.length == 2 ? 
        (args[1] !== undefined ? args[1] : {sender: this}) : 
        {sender: this};
      if (args.length == 2 && args[1] === undefined) {
        args[1] = arg1;
      }
      if (!arg1.sender && typeof arg1 === "object") {
        arg1.sender = this;
      }
      if (args.length == 1) args.push(arg1);
      
      return _emit.apply(this, args);
    };

    var _addListener = EventEmitter.prototype.addListener;
    EventEmitter.prototype.addListener = function (type, listener, disposable) {  
      //AOP the listener to remove itself as soon as it executes
      var me = this;
      if (disposable && typeof disposable.on === "function") {
        //NOTE: for the sake of this functionality, a "disposable" is an object that's expected to fire a "disposed" event when being disposed
        //this allows you to pass in an object that may dispose and have the event handler cleanup be done
        //automatically for you.
        disposable.once("disposed", function() {
          me.removeListener(type, listener);
        });
      }
      return _addListener.apply(this, arguments);
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    //convenience method for attaching one-time listeners
    EventEmitter.prototype.once = function(type, listener, disposable) {
      var me = this;
      var cb = listener;
      listener = function() {
        me.removeListener(type, listener);
        cb.apply(arguments.callee, arguments);
      };
      return this.on(type, listener, disposable);
    };

    /**
     * allow events to be suppressed by event type, and optionally buffered for re-emitting after unsuppression
     * pass null or nothing in for type param to indicate that all events should be suppressed
     * note: if suppressing all events, the only way to unsuppress any events is to unsuppress them all.
     * In other words, I'm doing no internal tracking/checking of "unsuppressed" event names against all possible events if _suppressAll is true 
     * (this is so the logic can remain fairly light; i.e. some edge cases are not currently supported)
     * @augments EventEmitter
     * @param {String | String[]} type - the event name to suppress, or an array of event names to suppress
     * @param {Boolean} buffer - flag to indicate whether the suppressed events should be buffered for re-emission after unsuppress
     * @param {Boolean} once - flag to indicate whether the event(s) should only be suppressed one time
     */
    EventEmitter.prototype.suppress = function(type, buffer, once) {
      this._suppressEvents = this._suppressEvents || {};
      this._suppressOnceEvents = this._suppressOnceEvents || {};
      var suppressionTarget = once ? this._suppressOnceEvents : this._suppressEvents;
      //instance level queue for all events so re-firing mixed suppressed events can be in the original order
      buffer && (this._buffer = this._buffer || []);
      //state object to track events that should be buffered
      buffer && (this._bufferedEvents = this._bufferedEvents || {});
      if (typeof type === "undefined" || type === null) {
        this._suppressAll = true;
        buffer && (this._bufferAll = true);
      } else {
        if (Array.isArray(type)) {
          for (var i = 0, l = type.length; i < l; i++) {
            suppressionTarget[type[i]] = true;
            buffer && (this._bufferedEvents[type[i]] = true);
          }
        } else {
          suppressionTarget[type] = true;
          buffer && (this._bufferedEvents[type] = true);
        }
      }  
    };

    /**
     * convenience alias for suppressing events one time
     * @augments EventEmitter
     * @param {String | String[]} type - the event name to suppress, or an array of event names to suppress
     * @param {Boolean} buffer - flag to indicate whether the suppressed events should be buffered for re-emission after unsuppress
     */
    EventEmitter.prototype.suppressOnce = function(type, buffer) {
      this.suppress(type, buffer, true);
    };

    /**
     * un-suppress events by event type, optionally re-emitting any buffered events in the process
     * @augments EventEmitter
     * @param {String | String[]} type - the event name to un-suppress, or an array of event names to un-suppress
     * @param {Boolean} bypassRefiring - flag to indicate whether buffered events should be re-emitted or not (true means events are NOT re-emitted; default behavior is to re-emit buffered events with original data)
     */
    EventEmitter.prototype.unsuppress = function(type, bypassRefiring) {
      //sanity assignments of the state objects to defend against case where .unsuppress is called before .suppress is ever called
      this._suppressEvents = this._suppressEvents || {};
      this._suppressOnceEvents = this._suppressOnceEvents || {};
      bypassRefiring = !!bypassRefiring; //normalize to proper bool
      var unsuppressAll = (typeof type === "undefined" || type === null);
      if (unsuppressAll) {
        //reset/remove all state flags
        this._suppressAll = false;
        this._bufferAll = false;
        delete this._suppressEvents;
        delete this._suppressOnceEvents;
        delete this._bufferedEvents;    
      } else if (!this._suppressAll) {
        //normalize type to an array
        type = Array.isArray(type) ? type : [type];
        var currType;
        for (var i = 0, l = type.length; i < l; i++) {
          currType = type[i];
          delete this._suppressEvents[currType];
          delete this._suppressOnceEvents[currType];      
        }    
      } else {
        //if we're currently suppressing all events, and .unsuppress is called with a granular event name or event list,
        //since we're not supporting this case (see comments for .suppress method), throw an error to alert
        //the developer that this is not a supported case currently and they should change their code.
        throw new Error("Cannot unsuppress a subset of events when the event emitter is currenly suppressing ALL events. Please change this call to unsuppress all events by passing either nothing or null in as the first argument.");
      }
      
      //if we got this far, now re-emit all appropriate buffered events
      if (this._buffer) {
        //do the loop thing
        var currEvent,
            length = this._buffer.length, //cache original length so we can stop the loop at the right spot if events get re-queued (which is possible for some supported cases)
            index = 0,
            offset = 0,
            mismatches = {}, //a cache to index mismatching types to minimize .indexOf lookups in the loop
            matches = {}; //a cache to index the types after first matching lookup to minimize .indexOf calls in the loop
        while (this._buffer && index < length) {
          if (this._buffer.length > 0) {
            currEvent = this._buffer[offset];
            //re-emit the event if type matches one of the passed in types or if we're unsuppressing all
            //note: even though suppress could be re-called during this process,
            //we'll go through the whole loop (up to the original length of the buffer)
            //this supports the case where a subset of events are re-suppressed and some of them are not
            if (!mismatches[currEvent.type] 
                && (unsuppressAll 
                    || matches[currEvent.type] 
                    || type.indexOf(currEvent.type) > -1)) {
              //cache this type to avoid an indexOf lookup next time the same type is checked
              matches[currEvent.type] = true;
              //take it out of the buffer
              this._buffer.splice(offset, 1);          
              //finally, re-emit unless told not to at the call level
              !bypassRefiring && EventEmitter.prototype.emit.apply(this, currEvent.args);
            } else {
              //mark this event type as a mismatch to avoid unneccesary lookup/checks next time one is found
              mismatches[currEvent.type] = true;
              offset++;
            }
            if (this._buffer.length == 0) delete this._buffer;
            index++;
          } else {
            delete this._buffer;
          }
        }
      }
    };
    
    /*************************************************************************************************************
     * finally, wrap in a Class container with additional high level concerns abstracted
     */
    
    /**
     * @namespace Root namespace for custom event publishing/subscribing/dispatching services
     * @name feather.event
     */
    feather.ns("feather.event");
     
    /**
     * @class This class wraps EventEmitter and abstracts away some of the more tedious concerns.
     * @extends feather.lang.baseClass
     * @extends EventEmitter
     */
    feather.event.eventPublisher = Class.create(feather.lang.baseClass, /** @lends feather.event.eventPublisher.prototype */ {
      /**
       * @constructs
       * @param {Object} $super
       * @param {Object} config
       */
      initialize: function($super, config) {
        $super(config);
        
        var me = this;
        
        EventEmitter.apply(this); //get the base node EventEmitter functionality
        
        //allow wiring events via the constructor
        if (config && (config.on || config.once)) {
          if (config.on) {
            for (var evt in config.on) {
              me.on(evt, config.on[evt]);
            }
          }                
          if (config.once) {
            for (var evt2 in config.once) {
              me.once(evt2, config.once[evt2]);
            }
          }
        }
      },        
      //IDisposable
      /**
       * Disposes of (removes) all listeners.
       * @param {Object} $super
       */
      dispose: function($super) {
          this.removeAllListeners();
          //TODO: what else does this class need to dispose of?
          $super();
      }
    });
    
    Object.extend(feather.event.eventPublisher.prototype, EventEmitter.prototype);

    /**
     * Global event dispatcher object for wide spread broadcasting and generic subscriptions.
     * This facilitates greater de-coupling where publishers and subscribers need not know about each other.
     * This is an instance of {@link feather.event.eventPublisher}.
     * @name feather.event.eventDispatcher
     */
    feather.event.eventDispatcher = new feather.event.eventPublisher();
    
    /*
     * turn the top level object into a pub/sub hub as well
     */
    var oldfeatherId = feather.id;
    Object.extend(feather, new feather.event.eventPublisher());
    feather.id = oldfeatherId;
    
    /**
     * @class domEventCache allows a local caching policy for DOM event handlers
     */
    feather.event.domEventCache = Class.create( /** @lends feather.event.domEventCache.prototype */ {
        /**
         * Initializes the event cache for handlers
         */
        initialize: function() {
            // public properties
            this.observers = [];
        },
        /**
         * Attaches an event handler to a DOM element
         * @param {Object} element  Element on which to observe event
         * @param {String} name Event name
         * @param {Function/Object} observer    Function to call when event is triggered
         * @returns {Object} Details on the observer
         */
        bind: function(element, name, observer) {
            if (typeof observer != "function") {
                if (!observer.id || !observer.fn) {
                    throw new Error("If the observer object is not a function, it must have both an 'id' (string) and 'fn' (function) property.");
                }
                if (this.observers.any(function(o) {
                    return o.id && o.id == observer.id;
                })) {
                    throw new Error("Cannot register two DOM event observer objects with the same id.");
                }
            }
            var me = this;
            var observerObject = {
                element:    $(element),
                name:        name,
                observer:    observer,
                unbind: function() {
                    me.unbind(observerObject);
                }
            };
            this.observers.push(observerObject);
            observerObject.element.bind(name, observer.fn || observer);
            return observerObject;
        },
        
        /**
         * Detach an event handler from a DOM element
         * @param {Object} observerObject
         */
        unbind: function(observerObject) {
            if (this.observers.find(function(obs) {
                    return obs === observerObject;
                })) {
                        
                try { 
                    observerObject.element.unbind(observerObject.name, observerObject.observer.fn || observerObject.observer); 
                } catch(ex) {
                    
                }
                //send to back of execution stack (this patches unbindAll)
                var me = this;
                setTimeout(function() {
                    if (me.observers) {
                        me.observers = me.observers.reject(function(obs) {
                            return obs === observerObject;
                        });
                    }                
                    observerObject = null;    
                }, 1);
            }
        },
        
        /**
         * Detach an event handler from a DOM element, using an ID
         * @param {String} id   ID reference to observer details
         */
        unbindById: function(id) {
            var observer = this.observers.find(function(o) {
                return o.id && o.id == id;
            });
            if (observer) {
                this.unbind(observer);
            }
        },
        /**
         * Detach all event handlers
         */
        unbindAll: function() {
            var me = this;
            this.observers.each(function(obs) {
                me.unbind(obs);
            });
        },    
        // IDisposable
        /**
         * Disposes of the cache by unbinding all and removing observers. 
         */
        dispose: function() {
            this.unbindAll();
            this.observers = null;
        }
    });
    
})();