var sys = require("sys"),
  fs = require("fs"),
  Connect = require("./connect/lib/connect/index");

exports.init = function(options) {
                sys.puts("logging.init");  
  jojo.ns("jojo.logging");
  
  jojo.logging.logger = Class.create(jojo.fsm.finiteStateMachine, {
    states: {
      initial: {
        stateStartup: function(fsm, args) {
          var options = args.options || {};
          fsm.queue = [];
          fsm.logFile = options.logFile || jojo.logFile; //MUST be a valid fileDescriptor, open for append
          return fsm.states.ready;
        }
      },
      ready: {
        log: function(fsm, args) {
          fsm.queue.push(args.text);
        },
        flush: function(fsm, args) {
          return fsm.states.flushing;
        }
      },
      flushing: {
        stateStartup: function(fsm, args) {
          if (fsm.logFile) {
            var str = fsm.queue.join("\n") + "\n";
            fsm.queue = [];
            fs.write(fsm.logFile, str, null, "utf8", function(err, written) {
              if (err) throw err;
              fsm.fire("logFileWritten");
            });
          } else {
            fsm.queue.forEach(function(str) {
              sys.puts(str);
            });
            fsm.queue = [];
            return fsm.states.ready;
          }
        },
        log: function(fsm, args) {
          fsm.queue.push(args.text);
        },
        logFileWritten: function(fsm, args) {
          return fsm.states.ready;
        }
      }
    },
    log: function(text) {     
      this.fire("log", {text: text});
    },
    flush: function() {
      this.fire("flush");
    },
    dispose: function($super) {
      this.flush();
      delete this.queue;
      $super();
    }
  });
  
  jojo.logging.connectLogger = function() {
    return function(req, res, next) {
      var stream = {
        write: function(str) {
          if (jojo.logger) {
              jojo.logger.log(str);
          }
        }
      };
      Connect.logger({stream: stream})(req, res, next);
    };
  };
};
