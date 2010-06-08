//for now very basic detection based on known globals - this could be just a tad brittle but for now it should suffice
//note, if in a weird environment with no top level window or exports object, this should blow up, indicating you're doing something horribly wrong
var context = (function() {
    try {
        return window;
    } catch (e) {
        try {
            exports.isNode = true;
            return exports;
        } catch (e2) {
            //oh my goodness, we don't have a freaking clue what environment we're in, blow up...
            throw new Error("A known environment was not detected.");
        }
    }
    
})();
var _global = context.isNode ? global : window;

(function(env) { //module pattern for client-safety, as this code could run on either the client or the server
    
    //basic sanity check - if no context is available, blow up (note, environment auto-detection should have already blown the app up, but I'm leaving this check here in case I change that auto-detection stuff later)
    if (!env.context) {
        throw new Error("jojo requires a context object - something isn't right here.");
    }
        
    _global.jojo = {
        isOnServer: env.isOnServer,
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
         *  - added robust support for defining namespaces on arbitrary contexts (defaults to detected environment context)
         *  - added the fact that it returns the new namespace object regardless of the context
         * @param {Object} spec - the namespace string or spec object (ex: {com: {trifork: ['model,view']}})
         * @param {Object} context - the root context onto which the new namespace is added (defaults to detected environment context)
         */
        ns: function(spec, _context) {
            var validIdentifier = /^(?:[a-zA-Z_]\w*[.])*[a-zA-Z_]\w*$/,i,N;
            _context = _context || _global;
            spec = spec.valueOf();
            var ret;
            if (typeof spec === 'object') {
                if (typeof spec.length === 'number') {//assume an array-like object
                    for (i=0,N=spec.length;i<N;i++) {
                         ret = jojo.ns(spec[i], _context);
                    }
                }
                else {//spec is a specification object e.g, {com: {trifork: ['model,view']}}
                    for (i in spec) if (spec.hasOwnProperty(i)) {
                        _context[i] = _context[i] || {};
                         ret = jojo.ns(spec[i], _context[i]);//recursively descend tree
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
                       _context[spec] = _context[spec] || {};
                       _context = _context[spec];
                   }
                   return _context; // return the lowest object in the hierarchy
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
         * framework init function
         * note: this will pull in additional files as needed depending on environment
         * @param {Object} options
         */
        init: function(options) {
            options = options || {};
            options.appName = options.appName || "jojo";
            jojo.appOptions = options;
            
            if (jojo.isOnServer) {
                require("./server").init(jojo);
			} else {
                //setup an onbeforeunload handler to tell the server to release page based session data
                //i.e. data that should not live across page loads
                var oldUnload = window.onbeforeunload;
                window.onbeforeunload = function(){
                    pageUnload(); //this function is defined in proxy.js, which must be included in the page
                    if (oldUnload) {
                        var res = oldUnload();
                        if (res) {
                            return res;
                        }
                    }
                };
            }
            
            //put the framework into a ready state (or at least try to)
            jojo.stateMachine.fire("loadingComplete");
        }
    };
})({ // module/environment configuration auto-detection:
    /**
     * simple context switching to support code that might run in various environments 
     * (for now Jaxer and node.js are supported sever-side)
     * note: if running in Jaxer, the window object will be present on the server, so is still a suitable context object
     */
    context: context,
    /**
     * basic environment detection logic - this might require some maintenance/tweaking as the
     * scope of jojo expands...
     */
    isOnServer: !!context.isNode
});
