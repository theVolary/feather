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
    cache = require("./simple-cache"),
    uuid = require("node-uuid"),
    util = require("./util"),
    server = require("./server");

/**
 * @namespace serves as the root namespace for the entire framework
 * @name feather
 */
var feather = exports.feather = /** @lends feather */ {

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

    feather.stateMachine = new FSM({
      states: {
        initial: {
          stateStartup: function(fsm, args) {
            //add a hook for clean shutdown to the process itself.
            fsm.onceState("ready", function() {
              process.on('SIGINT', feather.shutdown);
              process.on('SIGTERM', feather.shutdown);
            });          
            //go right to the "loading state" since that is exactly what we're doing at the time this instance is created
            return fsm.states.loading;
          }
        },
        loading: {
          ready: function(fsm, args) {
            //once everything is loaded, go to the ready state
            return fsm.states.ready;
          }
        },
        ready: FSM.emptyState
      }
    });

    // logger.js stuff

    /**
     * A singleton instance of {@link feather.logging.Logger} for use in apps.
     * @name feather.logger
     */
    feather.logger = new feather.logging.Logger();

    // Data stuff
    var dataInterface = null;
    if (options.data.appdb || options.data.authdb) {
      dataInterface = require("./data");
    }
    if (options.data.appdb) {
      feather.data.appdb = new dataInterface(options.data.appdb);
    }
    if (options.data.authdb) {
      feather.data.authdb = new dataInterface(options.data.authdb);
    }

    server.init(options, function(err, _server) {
      if (err) throw err;

      _server.on("close", function(errno) {
        feather.logger.info({message:"feather server shutting down.", category:'feather.srvr', immediately:true});
      });

      feather.server = _server;

      //start up the socket server
      serverDotSocket.init(options, function(err, socketServer) {
        if (err) throw err;

        authServer.init(options, function(err, auth) {
          if (err) throw err;
          
          //logging
          feather.logger.info({message:"feather server listening on port: " + options.port + ".  Welcome to feather!", category:"feather.srvr"});

          //now finally make the move to the ready state
          feather.stateMachine.fire("ready");
        });
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

  // File indexer variables
  appDirectories: {},
  appFiles: {},
  cssFiles: {},
  featherFiles: {},
  templateFiles: {},
  widgetClientFiles: {},

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

  Widget: Widget
}; // end exports.feather
//console.log(require("util").inspect(feather));