(function() { 
    
    var context = window;
        
    context.jojo = {
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
        ns: (function() {
            var validIdentifier = /^(?:[a-zA-Z_]\w*[.])*[a-zA-Z_]\w*$/,i,N;
            return function(spec, _context) {                
                _context = _context || context;
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
            };
        })(),
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
        emptyArray: []
    };
})();
