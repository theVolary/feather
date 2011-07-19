var simpleId = require("./simple-id"),
    ns = require("./ns"),
    _ = require("underscore")._,
    inherits = require("inherits"),
    EventPublisher = require("./event-publisher"),
    Registry = require("./registry"),
    Semaphore = require("./semaphore"),
    BaseClass = require("./base-class"),
    FSM = require("./fsm"),
    Logger = require("./logger"),
    Widget = require("./widget"),
    DomPool = require("./dom").DomPool,
    DomResource = require("./dom").DomResource,
    cache = require("./simple-cache"),
    uuid = require("node-uuid"),
    util = require("./util"),
    server = require("./server"),
    socket = require("./socket"),
    auth = require("./auth");

/**
 * @namespace serves as the root namespace for the entire framework
 * @name feather
 */
var feather = module.exports = /** @lends feather */ {

  id: simpleId,

  ns: ns,

  recursiveExtend: util.recursiveExtend,
  
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
    
    //store a read-only copy of options in cache so that other modules
    //can inspect original options reliably
    var cacheToken = uuid();
    cache.setItemReadOnly("feather-options", options, cacheToken);
    //store an unprotected copy for convenience 
    feather.appOptions = options;

    /**
     * A dom resource singleton in the feather namespace
     * @name feather.domPool
     * @see DomPool
     */
    feather.dom = new DomResource({
      onState: {
        ready: function() {
          cache.setItem("feather-dom", feather.dom);
        }
      }
    });    

    /**
     * A dom pool in the feather namespace
     * @name feather.domPool
     * @see DomPool
     */
    feather.domPool = new DomPool(options.domPoolSize);
    cache.setItem("feather-domPool", feather.domPool);

    feather.stateMachine = new FSM({
      states: {
        initial: {
          stateStartup: function() {
            //add a hook for clean shutdown to the process itself.
            this.onceState("ready", function() {
              process.on('SIGINT', feather.shutdown);
              process.on('SIGTERM', feather.shutdown);
            });          
            //go right to the "loading state" since that is exactly what we're doing at the time this instance is created
            return this.states.loading;
          }
        },
        loading: {
          ready: function() {
            //once everything is loaded, go to the ready state
            return this.states.ready;
          }
        },
        ready: {
          stateStartup: function() {
            if (options.onReady && typeof(options.onReady) === 'function') {
              options.onReady(feather);
              options.onReady = null;
            }
          }
        }
      }
    });
    cache.setItem("feather-stateMachine", feather.stateMachine);

    // logger.js stuff

    /**
     * A singleton instance of {@link feather.logging.Logger} for use in apps.
     * @name feather.logger
     */
    feather.logger = new feather.logging.Logger(options.logging);
    cache.setItem("feather-logger", feather.logger);

    // Data stuff
    var dataInterface = null;
    if (options.data.appdb || options.data.authdb) {
      dataInterface = require("./data");
    }
    if (options.data.appdb) {
      feather.data.appdb = new dataInterface(options.data.appdb);
      cache.setItem("feather-appdb", feather.data.appdb);
    }
    if (options.data.authdb) {
      feather.data.authdb = new dataInterface(options.data.authdb);
      cache.setItem("feather-authdb", feather.data.authdb);
    }

    if (options.onInit && typeof(options.onInit) === 'function') {
      options.onInit(feather);
      options.onInit = null;
    }

    server.init(options, function(err, _server) {
      if (err) throw err;

      _server.on("close", function(errno) {
        feather.logger.info({message:"feather server shutting down.", category:'feather.srvr', immediately:true});
      });

      feather.server = _server;
      cache.setItem("feather-server", _server);

      //start up the socket server
      socket.init(options, function(err, socketServer) {
        if (err) throw err;

        feather.socketServer = socketServer;
        cache.setItem("feather-socketServer", socketServer);

        require("./server.loadwidget");

        if (feather.appOptions.auth.enabled) {
          feather.auth = require("./auth");
        }

        feather.logger.info({message:"feather server listening on port: " + options.port + ".  Welcome to feather!", category:"feather.srvr"});

        //now finally make the move to the ready state
        feather.stateMachine.fire("ready");
      });
    });
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
        if (feather.socketServer) {
          try {
            feather.socketServer.server.close();
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
   * @namespace Root namespace for data class definitions and services
   * @name feather.data
   */
  data: {
    // Content is added in init function.
  },

  /**
   * @namespace provides the lang namespace inside of the framework
   * @name feather.lang
   */
  lang: {
    BaseClass: BaseClass,
    Registry: Registry,
    Semaphore: Semaphore
  },

  /**
   * @namespace Root namespace for Finite State Machine class definitions and services
   * @name feather.fsm
   */
  fsm: {    
    FiniteStateMachine: FSM
  }, 

  /**
   * @namespace contains all things related to logging.
   * @name feather.logging
   */
  logging: {
    Logger: Logger
  },

  Widget: Widget,

  socket: socket
}; // end exports.feather
//console.log(require("util").inspect(feather));