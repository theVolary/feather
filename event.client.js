(function() {
	
	/**
     * domEventCache allows a local caching policy for DOM event handlers
     */
    jojo.event.domEventCache = Class.create({
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
         * @return {Object} Details on the observer
         */
        observe: function(element, name, observer) {
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
		        element:	element,
		        name:		name,
		        observer:	observer,
		        stopObserving: function() {
		            me.stopObserving(observerObject);
		        }
	        };
	        this.observers.push(observerObject);
	        element.on(name, observer.fn || observer);
	        return observerObject;
        },
		
        /**
         * Detach an event handler from a DOM element
         */
        stopObserving: function(observerObject) {
	        if (this.observers.any(function(obs) {
			        return obs === observerObject;
		        })) {
						
		        try { 
					observerObject.element.un(observerObject.name, observerObject.observer.fn || observerObject.observer); 
				} catch(ex) {
					
				}
				//send to back of execution stack
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
        stopObservingById: function(id) {
            var observer = this.observers.find(function(o) {
                return o.id && o.id == id;
            });
            if (observer) {
                this.stopObserving(observer);
            }
        },
        /**
         * Detach all event handlers
         */
        stopObservingAll: function() {
	        var me = this;
	        this.observers.each(function(obs) {
		        me.stopObserving(obs);
	        });
        },	
        // IDisposable
        dispose: function() {
	        this.stopObservingAll();
	        this.observers = null;
        }
    });
	
})();
