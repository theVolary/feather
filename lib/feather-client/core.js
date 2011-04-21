(function() { 
    
    var context = window;
        
    /**
     * @namespace This is the root namespace of the framework
     * @name feather
     */
    context.feather = {
        /**
         * Simple incremental ID provider for cases where the developer wants to rely on the framework to auto ID stuff
         * @name feather.id
         * @returns {String} of the form featherXXX, where XXX is a number.
         */
        id: (function() {
            var currID = 0;
            return function() {
                return "feather" + currID++;
            };
        })(),
        /**
         * Namespacing function, derived from: <a href="http://higher-order.blogspot.com/2008/02/designing-clientserver-web-applications.html">http://higher-order.blogspot.com/2008/02/designing-clientserver-web-applications.html</a>
         * <ul class="desc"><li>added robust support for defining namespaces on arbitrary contexts (defaults to detected environment context)</li>
         * <li>added the fact that it returns the new namespace object regardless of the context</li>
         * <li>added dontCreateNew flag to enable only returning an existing object but not creating new one if it doesn't exist</li></ul>
         * @name feather.ns
         * @param {Object} spec - the namespace string or spec object (ex: <pre class="code">{com: {trifork: ['model,view']}}</pre>)
         * @param {Object} context - the root context onto which the new namespace is added (defaults to detected environment context)
         */
        ns: (function() {
            var validIdentifier = /^(?:[a-zA-Z_]\w*[.])*[a-zA-Z_]\w*$/,i,N;
            return function(spec, _context, dontCreateNew) {                
                _context = _context || context;
                spec = spec.valueOf();
                var ret;
                if (typeof spec === 'object') {
                    if (typeof spec.length === 'number') {//assume an array-like object
                        for (i=0,N=spec.length;i<N;i++) {
                             ret = feather.ns(spec[i], _context);
                        }
                    }
                    else {//spec is a specification object e.g, {com: {trifork: ['model,view']}}
                        for (i in spec) if (spec.hasOwnProperty(i)) {
                            _context[i] = _context[i] || {};
                             ret = feather.ns(spec[i], _context[i]);//recursively descend tree
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
                         if (!dontCreateNew) {
                           _context[spec] = _context[spec] || {};
                         }
                         _context = _context[spec];
                         if (typeof _context === "undefined") break;    
                       }
                       return _context; // return the lowest object in the hierarchy
                    })();
                }
                else {
                   throw new Error("feather.ns() requires a valid namespace spec to be passed as the first argument");
                }
                return ret;
            };
        })(),
        
        /**
         * Flyweight empty Function
         * @name feather.emptyFn
         */
        emptyFn: function() {},
        
        /**
         * Flyweight empty Object
         * @name feather.emptyObj
         */
        emptyObj: {},
        
        /**
         * Flyweight empty String
         * @name feather.emptyString
         */
        emptyString: "",
        
        /**
         * Flyweight empty Array
         * @name feather.emptyArray
         */
        emptyArray: []
    };
})();
