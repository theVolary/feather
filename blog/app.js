var sys = require("sys"), Connect = require("connect");

//bootstrap jojo (default context object is 'global')
require("../lib/core").bootstrap(/*some custom context object can go here*/);

//TODO: These states have some core functionality which should be moved in the framework
//TODO: make generic configuration file loader for this stuff
jojo.init({
  debug: true,
  jojoRoot: "../lib/",
  appRoot: __dirname,
  enableLogging: true,
  logFilePath: "blog.log",
  data: {
    securitydb: {      
      /*hostUrl: 'http://localhost',
       dbName: 'auth',
       dbPort: 5984,
       cache: true,
       raw: false,
       auth: { username:"", password:"" },
       useAuth: false,
       secure: false*/
    },
    metadb: {      // ditto
    },
    appdb: {
      hostUrl: 'http://localhost',
      dbName: 'jojoblog',
      auth: {
        username: 'jojoadmin',
        password: 'jojoadmin'
      }
    }
  },
  session: {
    config: {
      key: 'jojoblog.sid',
      cookie: {
        path: '/',
        httpOnly: false,
        maxAge: 14400000
      },
      secret: 'jojo blog key'
    },
    ignorePaths: ['/robots.txt' /*, '/other files'  */]
  },
  logging: {
    enabled: true,
    defaultLevel: 'all',// values: all, trace, debug, info, warn, error, fatal, off
    absorbConsoleLogging: true,
    categories: {
      // values: all, trace, debug, info, warn, error, fatal, off
      'jojo.http': 'off',
      'jojo.fsm': 'info'
    },
    appenders: [{
      // Most basic of appenders.
      type: 'console',
      options: {
        layout: 'colored'
      }
    }, {
      type: 'file',
      disabled: true,
      options: {
        layout: 'colored',
        filename: 'jojoblog.log',
        maxFileSize: 10 * 1024 * 1024,
        numBackups: 2,
        filePollInterval: 60,
        includedCategories: ['jojo.http'],
        levelThreshold: 'info'
      }
    }, {
      type: 'file',
      disabled: true,
      options: {
        layout: 'colored',
        filename: 'nonhttp.log',
        maxFileSize: 10 * 1024 * 1024,
        numBackups: 2,
        filePollInterval: 60,
        excludedCategories: ['jojo.http']
      }
    }, {
      type: 'url',
      disabled: true,
      options: {
        host: 'localhost',
        port: '5984',
        path: '/jojoblog_log/',
        excludedCategories: ['jojo.http', 'jojo.fsm']
      }
    },    // example of a custom appender.  fn should be a function that /is/ the appender.  
    // In this case, the module pattern is used.
    // Incidentally, this is functionally identical to the url appender above.
    {
      type: 'custom',
      disabled: true,
      fn: (function() {
        var http = require('http');
        var connection = http.createClient(5984, 'localhost');
        var path = "/jojoblog_log/";
        var headers = {
          "Content-Type": "application/json",
          "Content-Length": 0
        };
        
        return function(loggingEvent) {
          var data = JSON.stringify({
            level: loggingEvent.level.levelName,
            message: loggingEvent.message,
            timestamp: loggingEvent.startTime,
            category: loggingEvent.category,
            exception: loggingEvent.exception
          });
          headers['Content-Length'] = data.length;
          var req = connection.request("POST", path, headers);
          req.write(data);
          req.end();
        };
      })()
    }],
    templates: [{
      id: 'separator',
      template: '-------------------------------------------------------------------------'
    }]
  },
  middleware: [],
  states: {
    ready: {
      stateStartup: function(fsm, args) {
        jojo.logger.info({
          message: "app is currently waiting on requests",
          category: 'jojo.http'
        });
      },
      request: function(fsm, args) {
        //we got a new request, move to the "processingRequest" state
        return fsm.states.processingRequest;
      }
    },
    processingRequest: {
      stateStartup: function(fsm, args) {
        var req = args.request;
        var res = args.response;
        
        //basic benchmarking
        req.startTime = (new Date()).getTime();
        
        jojo.logger.trace({
          templateId: 'separator',
          category: 'jojo.http'
        });
        jojo.logger.trace({
          message: "processing request: ${url}",
          replacements: req,
          category: 'jojo.http'
        });
        
        req.on("end", function() {
          fsm.fire("endRequest", {
            request: req,
            response: res
          });
        });
        
        //start running through the middleware
        args.next();
        
        //go back and wait for the next request
        return fsm.states.ready;
      }
    },
    global: {
      endRequest: function(fsm, args) {
        //done processing the request, we can go wait for a new one now
        //simple per-request benchmarking
        var req = args.request;
        var newTick = (new Date()).getTime();
        var diff = newTick - req.startTime;
        if (jojo.logger) {
          jojo.logger.trace({
            message: "request took ${ms} milliseconds",
            replacements: {
              ms: diff
            },
            category: 'jojo.http'
          });
          jojo.logger.trace({
            templateId: 'separator',
            category: 'jojo.http'
          });
        }
        delete jojo.request;
        delete jojo.response;
      }
    }
  }
});
