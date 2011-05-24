var simpleId = require("./simple-id")
    _ = require("underscore")._,
    registry = require("./registry"),
    semaphore = require("./semaphore"),
    baseClass = require("./base-class"),
    fsm = require("./fsm");

/**
 * @namespace serves as the root namespace for the entire framework
 * @name feather
 */
var feather = exports.feather = /** @lends feather */ {

  id: simpleId.id,

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
      _context = _context || global;
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

    options = options || {};
    options.featherRoot = options.featherRoot || "./";
    options.appRoot = options.appRoot || __dirname;
    options.publicRoot = options.publicRoot || options.appRoot + "/public";
    options.port = options.port || 8080;
    options.socketPort = options.socketPort || 8081;
    options.states = options.states || {};
    options.states.ready = options.states.ready || {
      request: function(fsm, args) {
        var res = args.eventArgs.response;
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('feather was started with no custom request handler.\n');
      }  
    };
    
    feather.appOptions = options;

    // event.js stuff


    // fsm.js stuff
    var states = feather.fsm.defaultStates;
    if (options.states) {
      _.extend(states, options.states);
    }
    feather.stateMachine = new fsm({
      states: states
    });

    if (options.fsmListeners && options.fsmListeners.length > 0) {
      options.fsmListeners.forEach(function(l) {
        feather.stateMachine.on(l.eventName, l.fn);
      });
    }

    // logger.js stuff

    /**
     * A singleton instance of {@link feather.logging.logger} for use in apps.
     * @name feather.logger
     */
    feather.logger = new feather.logging.logger();     

    require("./server").init(feather);
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
   * @namespace provides the lang namespace inside of the framework
   * @name feather.lang
   */
  lang: {
    baseClass: baseClass,
    registry: registry,
    semaphore: semaphore
  },
  /**
   * @namespace Root namespace for Finite State Machine class definitions and services
   * @name feather.fsm
   */
  fsm: {
    
    finiteStateMachine: fsm,
    
    /**
     * A static flyweight state transition function for returning to the original state of the FSM instance
     * @param {Object} fsm
     * @param {Object} args
     */
    gotoInitialState: function(fsm, args) {
      return fsm.states.initial;
    },
    /**
     * A static flyweight state transition function for going to an error state
     * @param {Object} fsm
     * @param {Object} args
     */
    gotoErrorState: function(fsm, args) {
      return fsm.states.error;
    },
    /**
     * A static flyweight state transition function for going to the previous state
     * @param {Object} fsm
     * @param {Object} args
     */
    gotoPreviousState: function(fsm, args) {
      return fsm.previousState;
    },
    /**
     * A static flyweight empty state (just an alias for feather.emptyObj)
     * note: using this alias in case feather.fsm.emptyState ever needs to be more than an empty object
     */
    emptyState: this.emptyObj,

    defaultStates: {
      initial: {
        stateStartup: function(fsm, args) {
            //go right to the "loading state" since that is exactly what we're doing at the time this instance is created
            return fsm.states.loading;
        }
      },
      loading: {
        loadingComplete: function(fsm, args) {
          //once everything is loaded, go to the ready state
          return fsm.states.loadingComplete;
        }
      },
      loadingComplete: {
        startup: function(fsm, args) {
          // Run one-time startup function if it exists.
          if (feather.appOptions.onStartup && typeof(feather.appOptions.onStartup) === "function") {
            feather.appOptions.onStartup();
          }
        },
        ready: function(fsm, args) {
          // Before moving to the ready state, add a hook for clean shutdown to the process itself.
          process.on('SIGINT', function() {
            feather.shutdown();
          });
          process.on('SIGTERM', function() {
            feather.shutdown();
          });
          return fsm.states.ready;
        }
      },
      ready: feather.fsm.emptyState
    }
  }, // end fsm
}; // end exports.feather

