require.paths.unshift(__dirname);
var path = require("path"),
    baseApp = require("featherlib/base-app");

var options = {
	debug: true,
	appRoot: __dirname,
  port:8088,
  socketPort:8089,
	daemon: {
		runAsDaemon: false,
		outputPath: path.basename(__dirname) + '.out',
		pidPath: '/tmp/' + path.basename(__dirname) + '.pid'
	},
	environments: {
		dev: {
			auth: {
				enabled: false
			},
			logging: {
				enabled: true,
				defaultLevel: 'all',// values: all, trace, debug, info, warn, error, fatal, off
				absorbConsoleLogging: true,
				categories: {
					// values: all, trace, debug, info, warn, error, fatal, off
					'feather.http': 'off',
					'feather.fsm': 'info'
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
						filename: 'featherblog.log',
						maxFileSize: 10 * 1024 * 1024,
						numBackups: 2,
						filePollInterval: 60,
						includedCategories: ['feather.http'],
						levelThreshold: 'info'
					},
				}, {
					type: 'file',
					disabled: true,
					options: {
						layout: 'colored',
						filename: 'nonhttp.log',
						maxFileSize: 10 * 1024 * 1024,
						numBackups: 2,
						filePollInterval: 60,
						excludedCategories: ['feather.http']
					}
				}, {
					type: 'url',
					disabled: true,
					options: {
						host: 'localhost',
						port: '5984',
						path: '/featherblog_log/',
						excludedCategories: ['feather.http', 'feather.fsm']
					}
				},    // example of a custom appender.  fn should be a function that /is/ the appender.  
				// In this case, the module pattern is used.
				// Incidentally, this is functionally identical to the url appender above.
				{
					type: 'custom',
					disabled: true,
					fn: (function(){
						var http = require('http');
						var connection = http.createClient(5984, 'localhost');
						var path = "/featherblog_log/";
						var headers = {
							"Content-Type": "application/json",
							"Content-Length": 0
						};
						
						return function(loggingEvent){
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
			} // end logging
		} // end dev environment
	}, // end environments
	onReady: function(){
    feather.ns("featherdoc"); // ensure the namespace exists.
    var MarkdownCache = require("MarkdownCache").MarkdownCache;
    featherdoc.markdownCache = new MarkdownCache(10000);
	}
};

feather.start(options);
