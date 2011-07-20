exports.onReady = function(feather) {
  var BlogApi = require("./lib/blogapi").BlogApi;
  feather.blog = {
    api: new BlogApi(feather)
  };
};

/**
 * The onLoggerReady hook is called immediately after the app's logger is initialized.
 * This is an example of extra appenders added at runtime.  Note that these are all disabled for 
 * the sample app, so they have no effect, but they are functional.
 * It should also be noted that any exposed API of the logger can be accessed at this point, not 
 * just adding appenders.  Messages could be logged, programmatic templates added, etc.
 */
exports.onLoggerReady = function(logger) {
  var extraAppenders = [
    { 
      type: 'file', 
      disabled: true, 
      options: { 
        layout: 'colored', 
        filename: 'featherblog.log', 
        maxFileSize:10*1024*1024, 
        numBackups:2, 
        filePollInterval:60, 
        includedCategories: ['feather.http','feather.respack'],
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
        excludedCategories: ['feather.http'] } },
    { 
      type: 'url', 
      disabled: true, 
      options: { 
        host: 'localhost', 
        port: '5984', 
        path:'/featherblog_log/', 
        excludedCategories: ['feather.http', 'feather.fsm'] 
      }
    },
    // example of a custom appender.  fn should be a function that /is/ the appender.  
    // In this case, the module pattern is used to make the setup private.
    // Incidentally, this appender is functionally identical to the url appender above.
    { type: 'custom', 
      disabled: true,
      fn: (function() {
        var http = require('http');
        var connection = http.createClient(5984, 'localhost');
        var path = "/featherblog_log/";
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
  ];
  logger.addAppenders(extraAppenders);
};