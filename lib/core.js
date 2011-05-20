exports.bootstrap = function(ctx) {
  //since the intent for feather is not to be a re-usable module, but rather a full application development framework/platform,
  //I'm bootstrapping the 'feather' app variable to the global namespace. I may pull individual things out later into their own
  //modules/repositories (FSM for example)... but for now I'm rolling with global.feather.XYZ for convenience. This also
  //makes it easier to reference the framework from within widgets on the server, etc.
  var context = ctx || global; //doing this to make it easier to change context if some odd scenario pops up
  
  /**
   * @namespace serves as the root namespace for the entire framework
   * @name feather
   */
  context.feather = /** @lends feather */ {
    
      /**
       * if true, the code is running server-side.
       */
      isOnServer: !!context.isNode,
      
      /**
       * Simple incremental ID provider for cases where the developer wants to rely on the framework to auto ID stuff
       * @returns {String} string of the form "featherXXX", where XXX is a number.
       */
      id: (function() {
          var currID = 0;
          return function() {
              return "feather" + currID++;
          };
      })(),
      
      /**
       * Namespacing function, derived from: <a href="http://higher-order.blogspot.com/2008/02/designing-clientserver-web-applications.html">
       * http://higher-order.blogspot.com/2008/02/designing-clientserver-web-applications.html</a><br/>
       * <ul class="desc"><li>added robust support for defining namespaces on arbitrary contexts (defaults to detected environment context)</li>
       *  <li>added the fact that it returns the new namespace object regardless of the context</li>
       *  <li>added dontCreateNew flag to enable only returning an existing object but not creating new one if it doesn't exist</li></ul>
       * @param {Object} spec - the namespace string or spec object (ex: <code>{com: {trifork: ['model,view']}}</code>)
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
       * This function should allow the original object to be extended in such a way that if the 
       * new object (n) already contains a property of the old (o) and it is an object, it delves 
       * into the old object and overrides individual properties instead of replacing the whole 
       * object.  Likewise, if a property is an array, it should concatenate the new onto the old
       * rather than replacing the entire array (think config.json: resources.packages property).
       */
      recursiveExtend: function(n, o) {
        var type = null;
        for (var p in o) {
          
          if (n[p] && typeof(n[p]) === "object") {
            n[p] = feather.recursiveExtend(n[p], o[p]);
          } else if (n[p] && typeof(n[p]) === "array" && o[p] && typeof(o[p]) === "array") {
            n[p] = o[p].concat(n[p]);
          } else {
            n[p] = o[p];
          }
        }
        return n;
      },
      
      /**
       * Flyweight empty Function
       * @memberOf feather
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
       * Framework init function
       * @param {Object} options
       */
      init: function(options) {
        require(process.env.FEATHER_HOME + "/lib/server").init(options);
      },
      
      /**
       * Shuts down the server cleanly, but not before it is ready for requests.
       */
      shutdown: function() {
        if (feather.stateMachine) {
          feather.stateMachine.onceState("ready", function() {
            if (feather.server) {
              try {
                feather.server.close();
              } catch (exception) {
                feather.logger.error({message: "Error while shutting down http server: " + exception.message, category:'feather.srvr', exception: exception, immediately:true});
              }
              //process.exit(0);
            } else {
              feather.logger.error({message:"feather server cannot shut down.  feather.server is undefined", category:"feather.srvr"});
            }
            if (feather.socket.server) {
              try {
                feather.socket.server.server.close();
              } catch (exception) {
                feather.logger.error({message: "Error while shutting down socket server: " + exception.message, category:'feather.srvr', exception: exception, immediately:true});
              }

            } else {
              feather.logger.error({message:"feather socket server cannot shut down.  feather.server is undefined", category:"feather.srvr"});
            }
            process.nextTick(function() {
              process.exit(0);
            });
          });
        } else {
          feather.logger.error({message:"feather server cannot shut down.  feather.stateMachine is undefined", category:"feather.srvr"});
        }
      }, // end shutdown.
      
      start: function(options) {
        options = options || {};
        
        if (options.daemon.runAsDaemon) {
          var daemon = require("daemon");
          daemon.daemonize(options.daemon.outputPath, options.daemon.pidPath, function(err, pid) {
            feather.init(options);
          });
        } else {
          feather.init(options);
        }
      }
  };
};
