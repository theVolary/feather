require.paths.unshift('.');
var baseApp = require("jojolib/base-app");

var options = {
  // Any property /not/ in the environments block is global to all environments 
  // and is the default.  Each environment may still override.
  debug: true,
  appRoot: __dirname,
  environments: {
    dev: {
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
        metadb: {
          // ditto
        },
        appdb: {
          hostUrl: 'http://localhost',
          dbName:'jojoblog',
          auth: { username:'jojoadmin', password:'password' }
        }

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
        appenders: [
          { 
            // Most basic of appenders.
            type: 'console', 
            options: { layout:'colored' } 
          },
          { 
            type: 'file', 
            disabled: true, 
            options: { 
              layout: 'colored', 
              filename: 'jojoblog.log', 
              maxFileSize:10*1024*1024, 
              numBackups:2, 
              filePollInterval:60, 
              includedCategories: ['jojo.http'],
              levelThreshold: 'info'
            },
          },
          { 
            type: 'file', 
            disabled: true, 
            options: { 
              layout: 'colored', 
              filename: 'nonhttp.log', 
              maxFileSize:10*1024*1024, 
              numBackups:2, 
              filePollInterval:60, 
              excludedCategories: ['jojo.http'] } },
          { 
            type: 'url', 
            disabled: true, 
            options: { 
              host: 'localhost', 
              port: '5984', 
              path:'/jojoblog_log/', 
              excludedCategories: ['jojo.http', 'jojo.fsm'] 
            }
          },
          // example of a custom appender.  fn should be a function that /is/ the appender.  
          // In this case, the module pattern is used.
          // Incidentally, this is functionally identical to the url appender above.
          { type: 'custom', 
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
          }
        ],
        templates: [
          {id:'separator', template:'-------------------------------------------------------------------------'}
        ]
      }
    }
  },
  onReady: function() {
    jojo.ns("jojo.blog");
    var BlogApi = require("blogapi").BlogApi;
    jojo.blog.api = new BlogApi();
  }
};

jojo.start(options);