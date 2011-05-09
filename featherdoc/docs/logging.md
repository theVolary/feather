# feather Logging Documentation #
## Configuration ##
Logging is currently configured through the app.js file, though hooks have been created in the logging code to eventually allow external configuration (CouchDB documents, json files, etc.).

To configure logging, add an object to the feather.init options object called "logging".

### Options ###
* **enabled**: true / false
 	* set to false to completely disable logging within the system
* **defaultLevel**: string.  
	* This is the minimum level threshold for the default logger (or category).
	* Valid values: all, trace, debug, info, warn, error, fatal, off
* **absorbConsoleLogging**: true / false
	* Set to true to absorb console.log (debug/info/error/etc) calls into the logging framework.  Function calls get logged under the "[console]" category.
* **categories**: Object
	* Add category names to this object.  The values should be a level threshold, the same as the defaultLevel property.
* **appenders**: Array of Objects
	* Items in the array are config objects for each appender.  See the appenders section for configuration details.
* **templates**: Array of Objects
	* Templates are shortcuts for frequently used log statements
	* Objects have two properties: id and template
		* id: the identifier when using templates (ex: `feather.logger.info({templateId:'blah}));`)
		* template: the string or jQuery template to use in log statements

### Example Configuration ###
Here is a sample of the configuration found in the blog sample app.  

			logging: {  
			    enabled: true,  
			    defaultLevel: 'all',// values: all, trace, debug, info, warn, error, fatal, off  
			    absorbConsoleLogging: true,  
			    categories: {  
			      // values: all, trace, debug, info, warn, error, fatal, off  
			      'feather.http': 'trace',  
			      'feather.fsm': 'info'  
				  },  
				  appenders: [  
				    {   
				      // Most basic of appenders.  
				      type: 'console',   
				      options: { layout:'colored' }   
				    },  
				    {   
				      type: 'file',   
				      disabled: false,   
				      options: {   
				        layout: 'colored',   
				        filename: 'featherblog.log',   
				        maxFileSize:10*1024*1024,   
				        numBackups:2,   
				        filePollInterval:60,   
				        includedCategories: ['feather.http'] },  
				        levelThreshold: 'info'  
				      },  
				    {   
				      type: 'file',   
				      disabled: false,   
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
				    // In this case, the module pattern is used.  
				    // Incidentally, this is functionally identical to the url appender above.  
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
				  ],  
				  templates: [  
				    {id:'separator', template:'-------------------------------------------------------------------------'}  
				  ]  
				},

## Logging Messages ##
Here are examples of log calls containing every possible option:

`feather.logger.info({ message: 'hi Mom!' });`  
`feather.logger.info({ message: 'hi ${name}!', replacements: someObjectContainingANameProperty, category:'feather', exception: err });`  
`feather.logger.error({ templateId: 'errorTemplate', replacements: err, category:'feather.error' });`  

## Categories / Loggers ##
Categories (or Loggers) allow a granular setting of log level thresholds.  This is similar to other logging frameworks such as log4j.  A category is simply a unique string that is configured with a logging threshold.  Then, when logging, include the category in your log statements.

## Appenders ##
There are three predefined appenders: console, file, and url.  Console and file should be fairly self-explanatory.  URL simply sends log messages to a preconfigured url.  This is useful for sending log messages to a web service (or CouchDB!).

Appenders are functions that do something with a logging event.

### Global Appender Options ###
* **type**: The only required property is the `type` property.  Value values: `console`, `file`, `url`, `custom`.
* **disabled**: To temporarily disable an entire appender (such as when debugging), set this to true.
* **levelThreshold**: Set this to a log level threshold to limit messages that are sent to this appender.
* **includedCategories / excludedCategories**: Use one or the other.  Setting included categories will _only_ include categories found in the list.  Setting excluded categories will append all categories except those specified.

### Console Appender Options ###
* **layout**: valid values are `basic` and `colored`.  The two are functionally the same, but the colored layout injects ANSI color codes into the message.

### File Appender Options ###
* **layout**: valid values are `basic` and `colored`.  The two are functionally the same, but the colored layout injects ANSI color codes into the message.
* **filename**: Relative or absolute file path to the log file.
* **maxFileSize**: Maximum size in bytes of the file before rolling it (0 for unlimited).
* **numBackups**: Maximum number of backup files (rolling backups).
* **filePollInterval**: Interval in seconds to check for a full log file.

### URL Appender Options ###
* **host**: the host in the URL 
* **port**: number; if ommited, port 80 is used
* **path**: string; basically the remainder of the URL
* **verb**: string; the HTTP verb to use when sending the URL.  Defaults to POST.
* **contentType**: string; the value for the Content-Type header.  Defaults to application/json

### Custom Appenders ###
Creating custom appenders is also possible by specifying "custom" as the type.  The disabled option is supported for custom appenders since it is handled outside of each appender, but for `levelThreshold`, `includedCategories`, and `excludedCategories` to be supported the custom appender must make use of them.  

To create a custom appender, add the `fn` option to it, and set its value to a function.  One parameter will be passed to this function, representing the logging event for the appender to handle.  The logging event has the following properties:

*    startTime (a Date object representing the time of the event)
*    category
*  message
*  level (a Level object, containing the following properties)
    *  level: an integer representing the log level
    *  levelName: text name of the log level
    *  color: useful for console appending
* logger (used mainly internally to the framework)
* exception (this property may or may not exist, depending on the event)

## Templates ##
Templates are shortcuts for frequently used log statements.  They consist of an id and a template text.  The template may be a simple string, or it can use jQuery template syntax.  For example:

`{ id: 'separator', template: '---------------------'}` can then be used in code via the following log statement: `feather.logger.info({ templateId: 'separator' });`

Similarly, the template `{ id: 'foo', template: 'bar is ${bar}' }` can be used in code like so: `feather.logger.info({ templateId: 'foo', replacements: { bar: 'my bar value' } });`