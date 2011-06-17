//TODO: all the sync IO in this file needs to be changes to async

require('./date'); // augment Date object with date.js.
var path = require('path'),
    fs   = require('fs'),
    util = require("util"),
    inherits = require("inherits"),
    EventPublisher = require("./event-publisher"),
    Registry = require("./registry"),
    FSM  = require("./fsm"),
    Dom = require("./dom");

var dom = new Dom.DomResource();

// =============================================================================
// internal Level class definition    
function Level(options) {
  this.level = options.level || 0;
  this.levelName = options.name || "";
  this.color = options.color || "grey";
};

Level.prototype = {
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
};

Level.toLevel = function(levelStr) {
  if (!levelStr) {
    return levels.ALL;
  }
  if (typeof(levelStr) === 'string') {
    var l = levels[levelStr.toUpperCase()];
    if (l) { return l; }
  }
  return levels.ALL;
};

// =============================================================================
// internal Logger class definition
function Logger(options) {
  this.category = options.category || DEFAULT_CATEGORY;
  this.level = Level.toLevel(options.level);
  this.fsm = options.fsm || null;
  Logger.super.apply(this, arguments);
};

Logger.prototype = {
 setLevel: function(level) {
   this.level = Level.toLevel(level);
  },

  isLevelEnabled: function(otherLevel) {
    return this.level.isOff() == false && this.level.isLessThanOrEqualTo(otherLevel);
  },

  log: function(logLevel, message, exception) {
    if (this.level.isLessThanOrEqualTo(logLevel) && ! this.level.isOff() ) {
      var logEvt = {
        startTime: new Date(),
        category: this.category || DEFAULT_CATEGORY,
        level: logLevel,
        exception: null,
        message: message,
        logger: this
      };
      if (exception) {
        if (exception.message && exception.name) {
          logEvt.exception = exception;
        } else {
          logEvt.exception = new Error(util.inspect(exception));
        }
      }

      this.emit("log", logEvt);
    }
  }
};

inherits(Logger, EventPublisher);

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
      util.puts(layout(loggingEvent));
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
};

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
};

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
  categoryThresholds = {};
    
// Add some convenience methods to the Logger class.
['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(function(levelString) {
  var level = Level.toLevel(levelString);
  Logger.prototype[levelString] = function (message, exception) {
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
            if ((args.replacements || args.templateId) && dom) {
              var template = fsm.templates.findById(message);
              if (template) {
                message = template.template;
              }
              dom.onceState("ready", function() {
                var _t = dom.$j.template(null, message);
                message = _t(dom.$j, {
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

/**
 * Framework logger class.
 * @class
 * @extends feather.fsm.finiteStateMachine
 */
var logger = module.exports = function(options) {
  logger.super.apply(this, arguments);
};
logger.prototype = {

  /**
   * Configures the logger and prepares it for use.
   * @param {String | Object} configFileOrObject
   */
  configure: function(configFileOrObject) {
    var config = configFileOrObject;
    if (typeof(config) === 'string') {
      config = JSON.parse(fs.readFileSync(config, "utf8"));
    }
    if (config) {
      try {
        this.addAppenders(config.appenders);
        this.configureCategories(config.defaultLevel, config.categories);
        this.configureTemplates(config.templates);
        this.loggingEnabled = config.enabled;
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
    if (this.options) {
      return this.options;
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
  addAppenders: function(appenderList) {
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

  addAppender: function(appender) {
    if (appender) {
      this.addAppenders([appender]);
    }
  },
  
  /**
   * Configures the given list of categories, plues the default.
   * @param {String} defaultLevel the default logging level for categories
   * @param {Object} categories an object containing properties whose names are the categories, and values are the logging level for those categories.
   */
  configureCategories: function(defaultLevel, categories) {
    categoryThresholds[DEFAULT_CATEGORY] = defaultLevel;
    console.info("Default logging threshold is " + defaultLevel);
    
    for (var name in categories) {
      categoryThresholds[name] = categories[name];
    }
  },
  
  /**
   * Configures the given list of templates for use by the logger.
   * @param {Array} templates
   */
  configureTemplates: function(templates) {
    if (templates && templates.length) {
      for (var i = 0; i < templates.length; i++) {
        this.addTemplate(templates[i].id, templates[i].template);
      }
    }
  },
  
  /**
   * Adds the given template to the logger.
   * @param {String} id
   * @param {String} template
   */
  addTemplate: function(id, template) {
    return this.templates.add({id:id, template:template}, true);
  },
  
  /**
   * Removes the given template from the logger.
   * @param {String} id
   */
  removeTemplate: function(id) {
    return this.removeById(id);
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
      stateStartup: function() {
        this.templates = new Registry({unique:true});
        this.configure(this.findConfiguration());
        return this.states.ready;
      }
    }, // end initial state
    ready: FSM.emptyState
  } // end states
}; // end logger prototype

inherits(logger, FSM);