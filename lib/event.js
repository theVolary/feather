(function() { //module pattern for client-safety, as this code could run on either the client or the server
    exports = exports || {
        isOnClient: true
    };
    
    exports.init = function(jojo, appOptions) {
        /**
         * Root namespace for custom event publishing/subscribing/dispatching services
         */
        jojo.ns("jojo.event");
        
        //private methods ------------------------------------
        /**
         * Add a named event to the event registry
         * @param {Object} eventPublisher   Event publisher
         * @param {Object} eventObj Event to add to the registry
         */
        var addEvent = function(eventPublisher, eventObj) {
            if (typeof eventObj == "string") {
                eventObj = {
                    id: eventObj
                };
            }
            eventObj = Object.extend({
                fireGlobal: false // set true to fire as a global event after firing locally
            }, eventObj);
            if (eventPublisher === jojo.event.EventDispatcher) {
                eventObj.fireGlobal = false; //already at the global level... having true here would result in an infinite loop
            }
            var handlers = new jojo.lang.registry(true, false, "Error: Event handlers must have a unique id property (one will auto generate if you don't specify one)");
            var _handlers = eventObj.handlers || [];
            eventObj.handlers = handlers;        
            if (eventPublisher.eventCache[eventObj.id]) {
                throw new Error("Error: An event with this id has already been registered for this object.");
            }
            eventPublisher.eventCache[eventObj.id] = eventObj;
            _handlers.each(function(handler) {
                eventPublisher.on(eventObj.id, handler);
            });
        };
        
        /**
         * The EventPublisher class allows objects to fire events (and other objects to
         * subscribe handlers to those events). The events can be fired either 
         * synchronously or asynchronously (depending on how the handlers register themselves),
         * and may pass optional arguments to the handlers.
         */ 
        jojo.event.eventPublisher = Class.create(jojo.lang.baseClass, {
            /**
             * @constructor
             */
            initialize: function($super, config) {
                $super(config);
                
                var me = this;
                
                //public instance properties ---------------------------------------
                me.eventCache = {};
                me.suppressOnceEvents = {}; //events to NOT fire 1x
                me.suppressEvents = {}; //events to NOT fire until unsupress gets called on that event
                
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
            /**
             * Add one or more named events to the event registry
             * If a string is passed in, it will just add 1 event with a name matching the string
             * If an array of strings is passed in, it will add 1 event for each string in the array, using default values for all event settings
             * If an array of event settings objects are passed in, it will add 1 event for each object, using values from each object for all event settings
             * @param {String | Array} events
             */
            addEvents: function(events) {
                var me = this;
                if (typeof events == "string") {
                    addEvent(this, events);
                } else if (events.each) {
                    events.each(function(evt) {
                        addEvent(me, evt);
                    });
                } else {
                    throw new Error("Error: addEvents() only accepts 1 parameter, which can be a string or an array of event settings objects");
                }
            },    
            /**
             * Attaches a {handler} function to the publisher's {eventName} event for execution upon the event firing
             * @param {String | Object} _event Either a string event id, or a config object (must have an id property)
             * @param {Function} handler Function to execute when the event fires
             * @param {Boolean} async [optional] Defaults to false if omitted. Indicates whether to execute {handler} asynchronously (true) or not (false).
             * @param {Number} stackIndex [optional] Allows you to specify an order this handler should execute 
             * @param {Boolean} oneShot [optional] True to only execute this handler one time
             */ 
            on: function(_event, handler, async, stackIndex, oneShot) {
                var me = this;
                if (typeof _event == "string")
                    _event = {
                        id: _event,
                        handlers: [handler],
                        async: async,
                        stackIndex: stackIndex,
                        oneShot: oneShot
                    };
                if (_event.events) {
                    _event.events.each(function(evt) {
                        var evtObj = Object.extend({id: evt}, _event);
                        delete evtObj.events;
                        me.on(evtObj);
                    });
                    return false;
                }
                if (!_event.id) {
                    throw new Error("When registering an event handler, you must specify the id of the event you want to attach to. You can do so by passing a string, or in a config object.");
                }
                if (!_event.handlers) {
                    throw new Error("When registering an event handler, you must specify at least one function as the actual handler. If you pass event id as a string, this must be the second parameter passed, otherwise you must specify a 'handlers' array in the config object, which is an array of functions or handler objects ({id: 'someId', fn: someFunction}) containing at least one function or handler object.");
                }
                //normalize to lowercase
                _event.id = _event.id.toLowerCase();
                var eventObj = this.eventCache[_event.id];
                if (!eventObj) {
                    eventObj = {
                        id: _event.id,
                        fireGlobal: _event.fireGlobal,
                        handlers: _event.handlers
                    };
                    addEvent(this, eventObj); //this will re-call .on() with any handlers passed in
                    eventObj = this.eventCache[_event.id];
                } else {
                    if (_event.delay) {
                        _event.async = true;
                    }
                    _event.handlers.each(function(_handler) {
                        var handlerObj = _handler;
                        if (typeof _handler == "function") {
                            handlerObj = {
                                fn: _handler,
                                oneShot: _handler.oneShot
                            };
                        }
                        if (typeof handlerObj.fn != "function") {
                            throw new Error("Error: all event handlers must be functions, or contain an 'fn' property that is a function");
                        }
                        handlerObj = Object.extend({
                            id: jojo.id(),
                            async: _event.async,
                            oneShot: _event.oneShot,
                            stackIndex: _event.stackIndex,
                            delay: _event.delay
                        }, handlerObj);                    
                        eventObj.handlers.addAt(handlerObj, handlerObj.stackIndex);
                    });
                }
            },        
            /**
             * Attaches a {handler} function to the publisher's {eventName} event for execution upon the event firing.
             * The handler is immediately removed after the first time the event fires
             * @param {String | Object} _event Either a string event id, or a config object (must have an id property)
             * @param {Function} handler Function to execute when the event fires
             * @param {Boolean} async [optional] Defaults to false if omitted. Indicates whether to execute {handler} asynchronously (true) or not (false).
             * @param {Number} stackIndex [optional] Allows you to specify the order this handler should execute 
             */ 
            once: function(_event, handler, async, stackIndex) {
                if (typeof _event == "string") {
                    _event = {
                        id: _event,
                        handlers: [handler],
                        async: async,
                        stackIndex: stackIndex
                    };
                }
                _event.handlers.each(function(evt){
                    evt.oneShot = true;
                });
                this.on(_event);
            },        
            /**
             * Removes a single handler from a specific event
             * @param {String} eventName The event name to clear the handler from
             * @param {Function | String} handler A reference to the handler function, or the id of the handler object, to un-register from the event
             * @return {Boolean}    True if the removal was successful
             */ 
            removeEventHandler: function(eventName, handler) {
                //normalize to lower case
                eventName = eventName.toLowerCase();
                if (!this.eventCache[eventName]) {
                    throw new Error("Error: Cannot remove handlers from event '" + eventName + "'. That event is not a valid registered event.");
                }
                if (typeof handler == "string") {
                    return this.eventCache[eventName].handlers.removeById(handler);
                } else {
                    var foundHandler = this.eventCache[eventName].handlers.find(function(_handler) {
                        return _handler === handler || _handler.fn === handler || _handler.fn === handler.fn;
                    });
                    return this.eventCache[eventName].handlers.remove(foundHandler);
                }
            },        
            /**
             * Removes all handlers from a single event
             * @param {String} eventName The event name to clear handlers from
             */ 
            clearEventHandlers: function(eventName) {
                //normalize to lower case
                eventName = eventName.toLowerCase();
                if (this.eventCache[eventName]) {
                    this.eventCache[eventName].handlers.removeAll();
                }
            },
            /**
             * Removes all handlers from ALL events
             */ 
            clearAllEventHandlers: function() {
                for (var p in this.eventCache) {
                    this.eventCache[p].handlers.removeAll();
                }
            },
            /**
             * Prevents an event from firing 1x
             * @param {String} eventName    The event to suppress
             */
            suppressOnce: function(eventName) {
                //normalize to lower case
                eventName = eventName.toLowerCase();
                this.suppressOnceEvents[eventName] = true;
            },
            /**
             * Prevents an event from firing
             * @param {String} eventName    The event to suppress
             */
            suppress: function(eventName) {
                //normalize to lower case
                eventName = eventName.toLowerCase();
                this.suppressEvents[eventName] = true;
            },
            /**
             * Removes suppression of an event
             * @param {String} eventName    The event to unsuppress
             */
            unSuppress: function(eventName) {
                //normalize to lower case
                eventName = eventName.toLowerCase();
                delete this.suppressEvents[eventName];
                delete this.suppressOnceEvents[eventName];
            },
            
            /**
             * Fires the event {eventName}, resulting in all registered handlers to be executed.
             * @param {String} eventName The name of the event to fire
             * @param {Object} args [optional] Any object, will be passed into the handler function as the only argument
             */
            fire: function(eventName, args, passArgsAsParameters) {
                var me = this;
                //normalize to lower case
                eventName = eventName.toLowerCase();
                if (this.eventCache[eventName]) {
                    if(this.suppressOnceEvents[eventName] || this.suppressEvents[eventName]) {
                        delete this.suppressOnceEvents[eventName];
                    } else {
                        if (passArgsAsParameters !== true){
                            args = args || {};
                            args.sender = args.sender || this; //auto bind sender to passed args
                        }
                        var oneShotHandlers = [];
                        var me = this;
                        //sanity check
                        if (this.eventCache) {                    
                            this.eventCache[eventName].handlers.each(function(handler) {
                                //do a sanity check in each iteration to make sure the object wasn't disposed
                                if (me.eventCache) {
                                    if (handler.oneShot)
                                        oneShotHandlers.push(handler);
                                    if (handler.async || handler.delay){
                                        if(passArgsAsParameters){
                                            setTimeout(function() { handler.fn.apply(me,args); }, handler.delay || 1);
                                        }else{
                                            setTimeout(function() { handler.fn(args); }, handler.delay || 1);
                                        }
                                    } else {
                                        if(passArgsAsParameters === true){
                                            handler.fn.apply(me,args);
                                        }else{
                                            handler.fn(args);
                                        }
                                    }
                                }
                            });
                        }
                        oneShotHandlers.each(function(handler) {
                            if (me.removeEventHandler) {// support the possibility that the object was deconstructed during the event
                                me.removeEventHandler(eventName, handler);
                            }
                        });
                        //optionally fire globally
                        if (this.eventCache && this.eventCache[eventName].fireGlobal) {
                            jojo.event.eventDispatcher.fire(eventName, args); //TODO: some sort of automatic (or manual) namespacing?
                        }
                    }
                }
            },        
            /**
             * Listens to, and refires an event
             * @param {String | Object} _event Either a string event id, or a config object (must have an id property)
             * @param {Function} handler Function to execute when the event fires
             * @param {Boolean} async [optional] Defaults to false if omitted. Indicates whether to execute {handler} asynchronously (true) or not (false).
             * @param {Number} stackIndex [optional] Allows you to specify an order this handler should execute 
             * @param {Boolean} oneShot [optional] True to only execute this handler one time
             */ 
            bubble: function(publisher, _event, handler, async, stackIndex, oneShot) {
                if (typeof _event == "string") {
                    _event = {
                        id: _event,
                        handlers: [handler || jojo.emptyFn],
                        async: async,
                        stackIndex: stackIndex,
                        oneShot: oneShot
                    };
                }
                var publisherEvents = publisher.eventCache;
                if (!publisherEvents[_event.id]) {
                    var newEvent = {id: _event.id};
                    publisher.addEvents([newEvent]);
                }
                this.on(_event);
                this.on(_event.id, function(args) {
                    if (publisher && publisher.fire) { //sanity check
                        publisher.fire(_event.id, args);
                    }
                });
            },        
            //IDisposable
            dispose: function($super) {
                this.clearAllEventHandlers();
                //TODO: what does this class need to dispose of?
                $super();
            }
        });
    
        /**
         * Global event dispatcher object for wide spread broadcasting and generic subscriptions.
         * This facilitates greater de-coupling where publishers and subscribers need not know about each other.
         */
        jojo.event.eventDispatcher = new jojo.event.eventPublisher();
        
        /**
         * turn the top level object into a pub/sub hub as well
         */
        var oldJojoId = jojo.id;
        Object.extend(jojo, new jojo.event.eventPublisher());
        jojo.id = oldJojoId;
    };
    if (exports.isOnClient) {
        exports.init(jojo);
    }

})();