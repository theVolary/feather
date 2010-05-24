(function() {
	
	window.jojo = {
		version: "0.1.0",
		/**
		 * Simple incremental ID provider for cases where the developer wants to rely on the framework to auto ID stuff
		 */
		id: (function() {
			var currID = 0;
		    return function() {
		        return "jojo" + currID++;
		    };
		})(),
		/**
		 * Namespacing function, derived from: http://higher-order.blogspot.com/2008/02/designing-clientserver-web-applications.html
		 *  - added robust support for defining namespaces on arbitrary contexts (defaults to window)
		 *  - added the fact that it returns the new namespace object regardless of the context
		 * @param {Object} spec - the namespace string or spec object (ex: {com: {trifork: ['model,view']}})
		 * @param {Object} context - the root context onto which the new namespace is added (defaults to window)
		 */
		ns: function(spec, context) {
	        var validIdentifier = /^(?:[a-zA-Z_]\w*[.])*[a-zA-Z_]\w*$/,i,N;
	        context = context || window;
	        spec = spec.valueOf();
	        var ret;
	        if (typeof spec === 'object') {
	            if (typeof spec.length === 'number') {//assume an array-like object
	                for (i=0,N=spec.length;i<N;i++) {
	                     ret = jojo.ns(spec[i],context);
	                }
	            }
	            else {//spec is a specification object e.g, {com: {trifork: ['model,view']}}
	                for (i in spec) if (spec.hasOwnProperty(i)) {
	                    context[i] = context[i] || {};
	                     ret = jojo.ns(spec[i], context[i]);//recursively descend tree
	                }
	            }
	        } else if (typeof spec === 'string') {
				ret = (function handleStringCase(){
	               var parts;
	               if (!validIdentifier.test(spec)) {
	                   throw new Error('"'+spec+'" is not a valid name for a package.');
	               }
	               parts = spec.split('.');
	               for (i=0,N=parts.length;i<N;i++) {
	                   spec = parts[i];
	                   context[spec] = context[spec] || {};
	                   context = context[spec];
	               }
	               return context; // return the lowest object in the hierarchy
	            })();
	        }
	        else {
	           throw new Error("jojo.ns() requires a valid namespace spec to be passed as the first argument");
	        }
	        return ret;
	    },
		/**
		 * Flyweight empty Function
		 */
		emptyFn: function() {},
		
		/**
		 * Flyweight empty Object
		 */
		emptyObj: {},
		
		/**
		 * Flyweight empty String
		 */
		emptyString: "",
		
		/**
		 * Flyweight empty Array
		 */
		emptyArray: [],
		
		/**
		 * basic default framework init (provide overriden implementations where needed) - this one assumes jojo is running on the client
		 * (note: /js/server.js overrides this on the server by default, at time of writing - 2/23/2010)
		 * @param {Object} options
		 */
		init: function(options) {
			jojo.appOptions = options;
			//setup an onbeforeunload handler to tell the server to release page based session data
			//i.e. data that should not live across page loads
			var oldUnload = window.onbeforeunload;
			window.onbeforeunload = function() {
				pageUnload();
				if (oldUnload) {
					var res = oldUnload();
					if (res) {
						return res;
					}
				}
			};
			
			//put the framework into a ready state
			jojo.stateMachine.fire("loadingComplete");
		}
	};
	
	if (!Jaxer.isOnServer) {
		/**
		 * System wide alert function (defaults here to just be window.alert, but normalizing all calls through jojo.alert to allow overridden implementations)
		 */
		jojo.alert = function(message, callback) {
			message = message || "";
			message = message.message || message;
		    alert(message);
		    if (callback && typeof callback == "function") {
		        callback();
		    }
		};
		
		/**
		 * System wide confirm function (default to window.confirm... see note above for .alert())
		 */
		jojo.confirm = function(message, callback) {
			message = message || "";
			message = message.message || message;
		    var val = confirm(message);
		    if (callback && typeof callback == "function") {
		        callback(val);
		    }
			return val;
		};
		
		/**
		 * System wide message box (default will just map to alert, but overridden implementations should return a handle to an object that can be programmatically destroyed - for example, for an ajax loading message indicator)
		 */
		jojo.msg = function(message, callback) {
		    jojo.alert(message, callback);
		    return {dispose: jojo.emptyFn}; // this is just to prevent errors if using this implementation when another is expected (or stubbed)
		};
	}
})();


