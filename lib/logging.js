//var log4js = require('log4js')();
var logFacility = require('ain').set('jojoblog', 'daemon', 'localhost');

function logMessage(fsm, level, args) {
  jojo.stateMachine.onceState('ready', function() {
    if (fsm.loggingEnabled) {
      if (args) {
      
        // Grok the message to log.
        var message = null;
        if (typeof(args) === 'string') {
          message = args;
        } else if (typeof(args) == 'error') {
          message = args.name + ': ' + args.message;
          args = {
            exception: args
          };
        } else {
          message = args.templateId || args.message;
          if ((args.replacements || args.templateId) && $ && $.tmpl) {
            var template = fsm.templates.findById(message);
            if (template) {
              message = template.template;
            }
            debugger;
            message = $.tmpl(message, args.replacements || {})[0]._text;
          }
        }
      
        // Now log it!
        //log4js.getLogger(args.category).log(log4js.levels[level], message, args.exception);
        if (level == 'DEBUG') {
          level = 'trace';
        }
        logFacility.send(message, level.toLowerCase());
      }
    } // end if logging enabled
  }); // end onceState
}

exports.init = function(options) {
  jojo.ns("jojo.logging");
  
  jojo.logging.logger = Class.create(jojo.fsm.finiteStateMachine, {
    states: {
      initial: {
        stateStartup: function(fsm, args) {
          fsm.templates = new jojo.lang.registry({unique:true});
          fsm.loggingEnabled = false;
          if (jojo.appOptions.logging) {
            fsm.loggingEnabled = jojo.appOptions.logging.enabled;
          }
          return fsm.states.ready;
        }
      }, // end initial state
      ready: {
        stateStartup: function(fsm, args) {
          
        }
      },
    }, // end states
    
    addTemplate: function(id, template) {
      var fsm = this;
      return fsm.templates.add({id:id, template:template}, true);
    },
    
    removeTemplate: function(id) {
      var fsm = this;
      return fsm.removeById(id);
    },
    
    /**
     * @param options 
     * @option templateId an id for a previously registered template
     * @option message the message to log.  Can also be in the form of a jquery template
     * @option replacements the replacements for variables in message or templateId's template
     * @option exception an associated exception to go with the log message
     * @option category the specific logger category to log the message to
     */
    log: function(options) {  
      logMessage(this, 'INFO', options);
    },
    info: function(options) {
      logMessage(this, 'INFO', options);
    },
    trace: function(options) {
      logMessage(this, 'TRACE',options);
    },
    debug: function(options) {
      logMessage(this, 'DEBUG', options);
    },
    warn: function(options) {
      logMessage(this, 'WARN', options);
    },
    error: function(options) {
      logMessage(this, 'ERROR', options);
    },
    fatal: function(options) {
      logMessage(this, 'FATAL', options);
    },
    
    dispose: function($super) {
      this.templates.dispose($super); // TODO: Is this correct form?
      $super();
    },
    
    // categories
    categories: {
      jojo: '[jojo.framework]',
      fsm: '[jojo.fsm]',
      http: '[jojo.http]'
    }
  }); // end jojo.logging.logger
  
  jojo.logger = new jojo.logging.logger();
}; // end exports.init