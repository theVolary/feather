# feather Application Documentation #

## Creating a New Application ##
Currently, all applications must reside as a subfolder of the feather framework itself.  Here, then, are the steps to create a new application called "example".

1.  Create a new folder inside of feather called example
2.  Create a symbolic link called _featherlib_ inside of this folder that links to the feather's _lib_ folder. `ln -s ../lib featherlib`
3.  Create the following folders inside of _example_.
    *  lib
    *  public
    *  test
        *  unit
        *  integration
    *  data (This is optional, but is necessary if you wish to export data from your database.)
4.  Create a new javascript file that will be used to start your application.  You can call it whatever you wish, but the convention is to call it app.js or _your-app-name.js_).  For this example, we'll call it app.js.
5.  Add the following to your javascript file:  

		require.paths.unshift(__dirname);  
		var baseApp = require("featherlib/base-app");  
		
		feather.start({
			appRoot: __dirname,
			// Add your app's options here.
		});
6.  Create a new file *index.feather* in your app's public folder and give it some HTML content.
7.  Start your app by running `node app.js` from the `feather/example` folder.
8.  To stop your app when not running in daemon mode, simply press Ctrl-C from your terminal.

## Running your application as a Daemon process ##
To run your application as a daemon, add the following block to your app's options:  

	daemon: {
		runAsDaemon: true,
		outputPath: '/path/to/location/where/stdout/will/be/piped', // Defaults to: 'your-app-name.out',  
		pidPath: '/path/to/pid/file' // Defaults to: '/tmp/your-app-name.pid'
	}
	
To stop your application when it is running in daemon mode, you will have to manually send the PID (found in the file at pidPath) a kill command.

## Runtime Environments ##
feather apps borrow the concept of environments from other notable frameworks such as Grails.  To create a new runtime environment, add an environments block to your application, and add your options to environments in there instead of directly to options.  By convention, any options not in an environment block are included in all environments.  Environments can be named whatever you wish, but it is conventional to have environments named "dev", "prod", and possibly "staging" or "test".  If an option occurs both in and out of an environment block, the one inside the environment block will override the global one.  In the example below, logging is disabled by default.  However, each of the three environment blocks overrides it by enabling logging and setting the default logging level appropriately.  Finally, in the global options, add the *useEnv* option and set it to the name of one your environments to use that environment when the application runs.

	var appOptions = {
		appRoot: __dirname,
		daemon: {
			runAsDaemon: true
		},
		useEnv: 'dev', // Set this to determine which environment will be used at runtime.
		logging: {
			enabled: false
		}
		environments: {
			dev: {
				logging: {
					enabled: true,
					defaultLevel: 'all'
				}
			},
			test: {
				enabled: true,
				defaultLevel: 'debug'
			},
			prod: {
				enabled: true,
				defaultLevel: 'warn'
			}
		}
	};

## Option Reference ##
See the generated documentation for defaultOptions TODO: include link.


