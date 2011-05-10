require('./date'); // augment Date object with date.js.
var path = require('path'),
    fs   = require('fs'),
    sys  = require('sys');

// =============================================================================
// Level class definition    
var Level = Class.create({
  initialize: function(options) {
    this.level = options.level || 0;
    this.levelName = options.name || "";
    this.color = options.color || "grey";
  },
  toString: function() { return this.levelName; },
  isGreaterThanOrEqualTo: function(otherLevel) {
    return this.level >= otherLevel.level;
  },
  isLessThanOrEqualTo: function(otherLevel) {
    return this.level <= otherLevel.level;
  },
  isOff: function() {
    return this.level == Number.MAX_VALUE;
  }
});
Level.toLevel = function(levelStr) {
  if (!levelStr) {
    return levels.ALL;
  }
  if (typeof(levelStr) === 'string') {
    var l = levels[levelStr.toUpperCase()];
    if (l) { return l; }
  }
  return levels.ALL;
}

// =============================================================================
// Logging Event Object
var LoggingEvent = Class.create({
  initialize: function(options) {
    this.startTime = new Date();
    this.category = options.category || DEFAULT_CATEGORY;
    this.message = options.message;
    this.level = options.level;
    this.logger = options.logger;
    if (options.exception) {
      if (options.exception.message && options.exception.name) {
        this.exception = options.exception;
      } else {
        this.exception = new Error(sys.inspect(options.exception));
      }
    } // end initialize
  }
});

// =============================================================================
// Logger class

var Logger = Class.create(feather.event.eventPublisher, {
  category: '',
  level: '',
  fsm: null,
  initialize: function(options) {
    this.category = options.category || DEFAULT_CATEGORY;
    this.level = Level.toLevel(options.level);
    this.fsm = options.fsm;
  },
  setLevel: function(level) {
    this.level = Level.toLevel(level);
  },
  isLevelEnabled: function(otherLevel) {
    return this.level.isOff() == false && this.level.isLessThanOrEqualTo(otherLevel);
  },
  log: function(logLevel, message, exception) {
    if (this.level.isLessThanOrEqualTo(logLevel) && ! this.level.isOff() ) {
      var logEvt = new LoggingEvent({
        category: this.category,
        level: logLevel,
        exception: exception,
        message: message,
        logger: this
      });
      this.emit("log", logEvt);
    }
  }
});

var getLogger = function(category) {
  if (! category) {
    category = DEFAULT_CATEGORY;
  }
  
  if (! loggers[category]) {
    
    loggers[category] = new Logger({
      category:category,
      level: categoryThresholds[category]
    });
    var add = true;
    var appender;
    for (var i = 0; i < appenders.length; i++) {
      add = true;
      appender = appenders[i];
      if (appender.includedCategories && appender.includedCategories.indexOf(category) <= -1) {
        add = false;
      } else if (appender.excludedCategories && appender.excludedCategories.indexOf(category) > -1) {
        add = false;
      }
      if (add) {
        loggers[category].on('log', appenders[i]);
      }
    }
  }
  return loggers[category];
};

// =============================================================================
// Predefined appenders

var consoleAppender = function(options) {
  var layout = options.layout ? layouts[options.layout] : coloredLayout;
  var levelThreshold = levels.ALL;
  if (options.levelThreshold) {
    levelThreshold = Level.toLevel(options.levelThreshold);
  }
  return function(loggingEvent) {
    if (loggingEvent.level.isGreaterThanOrEqualTo(levelThreshold)) {
      sys.puts(layout(loggingEvent));
    }
  }
};

var fileAppender = function(options) {
    var layout = options.layout ? layouts[options.layout] : basicLayout;
    //syncs are generally bad, but we need
    //the file to be open before we start doing any writing.
    var logFile = fs.openSync(options.filename, 'a', 0644);

    if (options.maxFileSize > 0) {
        setupLogRolling(logFile, options.filename, options.maxFileSize, options.numBackups || 5, (options.filePollInterval * 1000) || 30000);
    }
    
    var levelThreshold = levels.ALL;
    if (options.levelThreshold) {
      levelThreshold = Level.toLevel(options.levelThreshold);
    }

    return function(loggingEvent) {
      if (loggingEvent.level.isGreaterThanOrEqualTo(levelThreshold)) {
        fs.write(logFile, layout(loggingEvent) + '\n', null, "utf8");
      }
    };
};

var urlAppender = function(options) {
  var http = require('http');
  var connection = http.createClient(options.port || 80, options.host);
  var path = options.path || '/';
  var verb = options.verb || "POST";
  var headers = {
    "Content-Type": options.contentType || "application/json",
    "Content-Length": 0 
  };
  var levelThreshold = levels.ALL;
  if (options.levelThreshold) {
    levelThreshold = Level.toLevel(options.levelThreshold);
  }
  
  return function(loggingEvent) {
    if (loggingEvent.level.isGreaterThanOrEqualTo(levelThreshold)) {
      var data = JSON.stringify({
        level: loggingEvent.level.levelName,
        message: loggingEvent.message,
        timestamp: loggingEvent.startTime,
        category: loggingEvent.category,
        exception: loggingEvent.exception
      });
      headers['Content-Length'] = data.length;
      var req = connection.request(verb, path, headers);
      req.write(data);
      req.end();
    }
  };
};

function setupLogRolling(logFile, filename, logSize, numBackups, filePollInterval) {
    fs.watchFile(filename,
    {
        persistent: false,
        interval: filePollInterval
    },
    function(curr, prev) {
        if (curr.size >= logSize) {
            rollThatLog(logFile, filename, numBackups);
        }
    }
    );
}

function rollThatLog(logFile, filename, numBackups) {
    //doing all of this fs stuff sync, because I don't want to lose any log events.
    //first close the current one.
    fs.closeSync(logFile);
    //roll the backups (rename file.n-1 to file.n, where n <= numBackups)
    for (var i = numBackups; i > 0; i--) {
        if (i > 1) {
            if (fileExists(filename + '.' + (i - 1))) {
                fs.renameSync(filename + '.' + (i - 1), filename + '.' + i);
            }
        } else {
            fs.renameSync(filename, filename + '.1');
        }
    }
    //open it up again
    logFile = fs.openSync(filename, 'a', 0644);
}

function fileExists(filename) {
    try {
        fs.statSync(filename);
        return true;
    } catch(e) {
        return false;
    }
}

// =============================================================================
// Predefined layouts

var basicLayout = function(loggingEvent) {
  
  var tlc = '['+loggingEvent.startTime.toString('yyyy-MM-dd hh:mm:ss') + '] [' + loggingEvent.level.toString() + '] [' + loggingEvent.category + '] - ';
  var output = tlc + loggingEvent.message;
  
  if (loggingEvent.exception) {
    output += '\n' + tlc;
    output += loggingEvent.exception.name + ': ' + loggingEvent.exception.message;
    if (loggingEvent.exception.stack) {
      output += '\n' + loggingEvent.exception.stack;
    }
  }
  return output;
};

var colorize = function(str, style) {
  var styles = {
      //styles
      'bold'      : [1,  22],
      'italic'    : [3,  23],
      'underline' : [4,  24],
      'inverse'   : [7,  27],
      //grayscale
      'white'     : [37, 39],
      'grey'      : [90, 39],
      'black'     : [90, 39],
      //colors
      'blue'      : [34, 39],
      'cyan'      : [36, 39],
      'green'     : [32, 39],
      'magenta'   : [35, 39],
      'red'       : [31, 39],
      'yellow'    : [33, 39]
  };
  var styleObj = styles.grey;
  if (styles[style]) { styleObj = styles[style]; }
  return '\033[' + styleObj[0] + 'm' + str +
      '\033[' + styleObj[1] + 'm';
}

var coloredLayout = function(loggingEvent) {
  var tlc = colorize('['+loggingEvent.startTime.toString('yyyy-MM-dd hh:mm:ss') + '] ', 'grey') 
    + colorize('[' + loggingEvent.level.toString() + '] ', loggingEvent.level.color) 
    + colorize('[' + loggingEvent.category + '] - ', 'grey');
  var output = tlc + loggingEvent.message;
  
  if (loggingEvent.exception) {
    output += '\n' + tlc;
    output += loggingEvent.exception.name + ': ' + loggingEvent.exception.message;
    if (loggingEvent.exception.stack) {
      output += '\n' + loggingEvent.exception.stack;
    }
  }
  return output;
};

var passThroughLayout = function(loggingEvent) {
  return loggingEvent.message;
}

// =============================================================================

function replaceConsole(logger) {
    function replaceWith (fn) {
        return function() {
            fn.apply(logger, arguments);
        }
    }

    console.log = replaceWith(logger.info);
    console.debug = replaceWith(logger.debug);
    console.trace = replaceWith(logger.trace);
    console.info = replaceWith(logger.info);
    console.warn = replaceWith(logger.warn);
    console.error = replaceWith(logger.error);
    console.fatal = replaceWith(logger.fatal);
}

var DEFAULT_CATEGORY = 'default',
    appenderTemplates = {
      'console': consoleAppender,
      'file': fileAppender,
      'url': urlAppender
    },
    appenders = [],
    loggers = {},
    levels = {
      ALL: new Level({level: 0, name:'ALL', color: 'grey'}),
      TRACE: new Level({ level: 5000, name:'TRACE', color: 'blue' }),
      DEBUG: new Level({ level: 10000, name:'DEBUG', color: 'cyan' }),
      INFO: new Level({ level: 20000, name:'INFO', color: 'green' }),
      WARN: new Level({ level: 30000, name:'WARN', color: 'yellow' }),
      ERROR: new Level({ level: 40000, name:'ERROR', color: 'red' }),
      FATAL: new Level({ level: 50000, name:'FATAL', color: 'magenta' }),
      OFF: new Level({ level: Number.MAX_VALUE, name:"OFF", color:"grey" })
    },
    layouts = {
      'basic': basicLayout,
      'colored': coloredLayout,
      'passThrough': passThroughLayout
    },
    categoryThresholds = {
      
    };
    
// Add some convenience methods to the Logger class.
['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(function(levelString) {
  var level = Level.toLevel(levelString);
  Logger.prototype[levelString.toLowerCase()] = function (message, exception) {
	  if (this.isLevelEnabled(level)) {
		  this.log(level, message, exception);
	  }
	};
});

function logMessage(fsm, level, args) {
  var f = function() {
    fsm.onceState('ready', function() {
      if (fsm.loggingEnabled) {
        if (args) {
  
          var _logger = getLogger(args.category);
  
          // Grok the message to log.
          var message = null;
          if (typeof(args) === 'string') {
            message = args;
            _logger.log(Level.toLevel(level), message, args.exception);
          } else if (typeof(args) == 'error') {
            message = args.name + ': ' + args.message;
            args = {
              exception: args
            };
            _logger.log(Level.toLevel(level), message, args.exception);
          } else {
            message = args.templateId || args.message;
            if ((args.replacements || args.templateId) && feather.dom) {
              var template = fsm.templates.findById(message);
              if (template) {
                message = template.template;
              }
              feather.dom.onceState("ready", function() {
                var _t = feather.dom.$j.template(null, message);
                message = _t(feather.dom.$j, {
                  data: args.replacements || {}
                }).join("");
                _logger.log(Level.toLevel(level), message, args.exception);
              });
            } else {
              _logger.log(Level.toLevel(level), message, args.exception);
            }
          }
        }
      } // end if logging enabled
    }); // end onceState
  };
  if (args.immediately) {
    f();
  } else {
    process.nextTick(f);
  }
}

exports.init = function(options) {
  /**
   * @namespace contains all things related to logging.
   * @name feather.logging
   */
  feather.ns("feather.logging");
  
  /**
   * Framework logger class.
   * @class
   * @extends feather.fsm.finiteStateMachine
   */
  feather.logging.logger = Class.create(feather.fsm.finiteStateMachine, /** @lends feather.logging.logger.prototype */ {
    
    /**
     * Configures the logger and prepares it for use.
     * @param {String | Object} configFileOrObject
     */
    configure: function(configFileOrObject) {
      var config = configFileOrObject,
          fsm = this;
      if (typeof(config) === 'string') {
        config = JSON.parse(fs.readFileSync(config, "utf8"));
      }
      if (config) {
        try {
          fsm.configureAppenders(config.appenders);
          fsm.configureCategories(config.defaultLevel, config.categories);
          fsm.configureTemplates(config.templates);
          fsm.loggingEnabled = config.enabled;
          if (config.absorbConsoleLogging) {
            replaceConsole(getLogger('console'));
          }
        } catch (e) {
          throw new Error("Problem reading logger config. Error was \"" + e.message + "\" ("+e.stack+")");
        }
      }
    },
    
    /**
     * Looks in the app's options to see if logging was configured, and if so, uses that.  If not found, looks elsewhere in the app (files, db, etc.)
     * @returns {Object}
     */
    findConfiguration: function() {
        if (feather.appOptions.logging) {
          return feather.appOptions.logging;
        } else {
          // TODO: Check for file, Couchdb, etc. in persistidigitation.  
          // This block would be equivalent to log4js's findConfiguration method.
          return undefined;
        }
    },
    
    /**
     * Configures the given list of appenders for use within this logger.
     * @param {Array} appenderList
     */
    configureAppenders: function(appenderList) {
      if (appenderList && appenderList.length == 0) {
        console.warn('No appenders specified in logging config!');
      }
      for (var i = 0; i < appenderList.length; i++) {
        var curr = appenderList[i];
        if (! curr.disabled) { // ignore disabled appenders
          var appender = null;
        
          if (curr.type === 'custom') {
            if (curr.fn) {
              appender = curr.fn;
            }
          } else {
            appender = appenderTemplates[curr.type](curr.options);
          } // end else        
        
          if (appender) {        
            // Address category inclusion / exclusions
            if (curr.options.includedCategories) {
              appender.includedCategories = curr.options.includedCategories;
            } else if (curr.options.excludedCategories) {
              appender.excludedCategories = curr.options.excludedCategories;
            }
            
            appenders.push(appender);
            var add = true;
            for (var category in loggers) {
              add = true;
              if (appender.includedCategories && appender.includedCategories.indexOf(category) <= -1) {
                add = false;
              } else if (appender.excludedCategories && appender.excludedCategories.indexOf(category) > -1) {
                add = false;
              }
              
              if (add) {
                loggers[category].on('log', appender);
              }
            } // end for each logger category
          }
        } // end if not disabled
      } // end for loop
    },
    
    /**
     * Configures the given list of categories, plues the default.
     * @param {String} defaultLevel the default logging level for categories
     * @param {Object} categories an object containing properties whose names are the categories, and values are the logging level for those categories.
     */
    configureCategories: function(defaultLevel, categories) {
      categoryThresholds[DEFAULT_CATEGORY] = defaultLevel;
      
      for (var name in categories) {
        categoryThresholds[name] = categories[name];
      }
    },
    
    /**
     * Configures the given list of templates for user by the logger.
     * @param {Array} templates
     */
    configureTemplates: function(templates) {
      for (var i = 0; i < templates.length; i++) {
        this.addTemplate(templates[i].id, templates[i].template);
      }
    },
    
    /**
     * Adds the given template to the logger.
     * @param {String} id
     * @param {String} template
     */
    addTemplate: function(id, template) {
      var fsm = this;
      return fsm.templates.add({id:id, template:template}, true);
    },
    
    /**
     * Removes the given template from the logger.
     * @param {String} id
     */
    removeTemplate: function(id) {
      var fsm = this;
      return fsm.removeById(id);
    },
    
    /**
     * Logs messages in the info level.
     * @param {String | Object} options if a String, the message to log.  If an object, can contain the following options: 
     *   <ul class="desc"><li>templateId: an id for a previously registered template</li>
     *   <li>message: the message to log.  Can also be in the form of a jquery template</li>
     *   <li>replacements: the replacements for variables in message or templateId's template</li>
     *   <li>exception: an associated exception to go with the log message</li>
     *   <li>category: the specific logger category to log the message to</li></ul>
     */
    log: function(options) {  
      logMessage(this, 'INFO', options);
    },
    
    /**
     * Logs messages in the info level.
     * @param {String | Object} options if a String, the message to log.  If an object, can contain the following options: 
     *   <ul class="desc"><li>templateId: an id for a previously registered template</li>
     *   <li>message: the message to log.  Can also be in the form of a jquery template</li>
     *   <li>replacements: the replacements for variables in message or templateId's template</li>
     *   <li>exception: an associated exception to go with the log message</li>
     *   <li>category: the specific logger category to log the message to</li></ul>
     */
    info: function(options) {
      logMessage(this, 'INFO', options);
    },
    
    /**
     * Logs messages in the trace level.
     * @param {String | Object} options if a String, the message to log.  If an object, can contain the following options: 
     *   <ul class="desc"><li>templateId: an id for a previously registered template</li>
     *   <li>message: the message to log.  Can also be in the form of a jquery template</li>
     *   <li>replacements: the replacements for variables in message or templateId's template</li>
     *   <li>exception: an associated exception to go with the log message</li>
     *   <li>category: the specific logger category to log the message to</li></ul>
     */
    trace: function(options) {
      logMessage(this, 'TRACE',options);
    },
    
    /**
     * Logs messages in the debug level.
     * @param {String | Object} options if a String, the message to log.  If an object, can contain the following options: 
     *   <ul class="desc"><li>templateId: an id for a previously registered template</li>
     *   <li>message: the message to log.  Can also be in the form of a jquery template</li>
     *   <li>replacements: the replacements for variables in message or templateId's template</li>
     *   <li>exception: an associated exception to go with the log message</li>
     *   <li>category: the specific logger category to log the message to</li></ul>
     */
    debug: function(options) {
      logMessage(this, 'DEBUG', options);
    },
    
    /**
     * Logs messages in the warn level.
     * @param {String | Object} options if a String, the message to log.  If an object, can contain the following options: 
     *   <ul class="desc"><li>templateId: an id for a previously registered template</li>
     *   <li>message: the message to log.  Can also be in the form of a jquery template</li>
     *   <li>replacements: the replacements for variables in message or templateId's template</li>
     *   <li>exception: an associated exception to go with the log message</li>
     *   <li>category: the specific logger category to log the message to</li></ul>
     */
    warn: function(options) {
      logMessage(this, 'WARN', options);
    },
    
    /**
     * Logs messages in the error level.
     * @param {String | Object} options if a String, the message to log.  If an object, can contain the following options: 
     *   <ul class="desc"><li>templateId: an id for a previously registered template</li>
     *   <li>message: the message to log.  Can also be in the form of a jquery template</li>
     *   <li>replacements: the replacements for variables in message or templateId's template</li>
     *   <li>exception: an associated exception to go with the log message</li>
     *   <li>category: the specific logger category to log the message to</li></ul>
     */
    error: function(options) {
      logMessage(this, 'ERROR', options);
    },
    
    /**
     * Logs messages in the fatal level.
     * @param {String | Object} options if a String, the message to log.  If an object, can contain the following options: 
     *   <ul class="desc"><li>templateId: an id for a previously registered template</li>
     *   <li>message: the message to log.  Can also be in the form of a jquery template</li>
     *   <li>replacements: the replacements for variables in message or templateId's template</li>
     *   <li>exception: an associated exception to go with the log message</li>
     *   <li>category: the specific logger category to log the message to</li></ul>
     */
    fatal: function(options) {
      logMessage(this, 'FATAL', options);
    },
    
    states: {
      initial: {
        stateStartup: function(fsm, args) {
          fsm.templates = new feather.lang.registry({unique:true});
          fsm.configure(fsm.findConfiguration());
          return fsm.states.ready;
        }
      }, // end initial state
      ready: feather.fsm.emptyState
    } // end states
  }); // end logger state machine
  
  /**
   * A singleton instance of {@link feather.logging.logger} for use in apps.
   * @name feather.logger
   */
  feather.logger = new feather.logging.logger(); 
}; // end exports init