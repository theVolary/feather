# feather Application Documentation #
These instructions assume you have feather installed via fvm (https://github.com/ryedin/fvm) so that the `feather` command is loaded into your terminal session.

## Creating a New Application ##
To create a new application, simply run `feather create-app [app_name]` from the command line, where `[app_name]` should be the name you want your app to have. Feather will create a new folder with that name from the location the command is run. Example: you are in a folder called `/feather_apps` and you run `feather create-app hello_world`; the result is a new folder at `/feather_apps/hello_world` that contains the skeleton folder and file structure for your new feather app.

## Running your application ##
Running the app is a simple matter of running `feather run` from the top-level folder of your app (`/feather_apps/hello_world/` in our example above). There are several command line options you can use with the run command: (NOTE: any options you provide via the command line will override the same options that might be defined in your config.json file)

-     -e: Lets you specify which config environment to use (defined in the "environments" section of your app's config.json file)
-     -z: Lets you run the app as a daemon
-     -o: Lets you specify the path of a file to pipe stdout to when running as a daemon (i.e. where to write out the log file)
-     -i: Lets you specify the path of the pid file when running as a daemon
-     -l: The default logging level to use.  Options are: all, trace, debug, info, warn, error, off
-     -d: Starts the app in node's CLI debugger (command line debugging)
-     -D: Starts the app in debug mode and hosts [node-inspector](https://github.com/dannycoates/node-inspector) on port 8888. To access this debugger you must use a recent webkit browser (Safari or Chrome) and browse to http://localhost:8888/debug?port=5858 (also see the documentation for [node-inspector](https://github.com/dannycoates/node-inspector))

## config.json ##
Your application can be configured via the `config.json` file in the top level app folder. When you first create your application, this file will contain only an empty JSON object (`{}`). If you edit this file, this object must be a valid JSON object (i.e. keys are all surrounded by quotes, etc.). The default configuration is as follows: (NOTE: any section you define in your app's `config.json` file will override these defaults)

    {
      "host": "localhost",
      "socket.io": {
        "port": 8081,
        "host": "localhost"
      },
      "auth": {
        "enabled": false,
        "userIdPrefix": "org.couchdb.user:"
      },
      "ssl": {
        "enabled": false,
        "key": "full/path/to/key_file",
        "cert": "full/path/to/cert_file",
        "useRedirectServer": true,
        "redirectServerPort": 80
      },
      "daemon": {
        "runAsDaemon": false,
        "outputPath": "feather-app.out",
        "pidPath": "/tmp/feather-app.pid",
        "runAsUser": "root"
      },
      "data": {
        "datalinking": {
          "enabled": true
        }
      },
      "domPoolSize": {
        "min": 10, 
        "max": 20
      },
      "environments": {
        "dev": {},
        "test": {}, 
        "prod": {},
        "unittest": {
          "debug": true,
          "daemon": {
            "runAsDaemon": false
          },
          "data": {
            "appdb": {
              "provider": "test"
            }
          },
          "logging": {
            "enabled": true,
            "defaultLevel": "trace",
            "absorbConsoleLogging": true
          }
        }
      },
      "logging": {
        "enabled": true,
        "defaultLevel": "all",
        "absorbConsoleLogging": true,
        "appenders": [
          {
            "type": "console",
            "options": { "layout": "colored" }
          }
        ],
        "templates": [
          {"id":"separator", "template":"-------------------------------------------------------------------------"}
        ]
      },
      "resources": {
        "publish": {
          "consolidate": false,
          "minify": false,
          "gzip": false,
          "publisherId": "local",
          "publishers": [
            {
              "id": "local",
              "config": {
                "publishLocation": "feather-res-cache"
              }
            }
          ]
        },
        "packages": [
          { 
            "name":"feather-client-core.js",
            "consolidate": false,
            "minify": false,
            "publisherId": "local"
          },
          {
            "name": "feather-client-core.css",
            "consolidate": false,
            "minify": true,
            "publisherId": "local"
          }
        ]
      },
      "session": {
        "config": {
          "key": "feather.sid",
          "cookie": { "path": "/", "httpOnly": false, "maxAge": 14400000 },
          "secret": "feather app key"
        },
        "ignorePaths": ["/robots.txt"]
      },
      "ui": {
        "enabled": true,
        "provider": {
          "jsFiles": [
            "/feather-client/lib/jqueryUI-1.8.14/js/jquery-ui-1.8.14.custom.min.js",
            "/feather-client/ui.js"
          ],
          "cssFiles": [
            "/feather-client/lib/jqueryUI-1.8.14/css/black-tie/jquery-ui-1.8.14.custom.css"
          ]
        }
      }
    }

It's important to note that you may add any arbitrary sections you want to this file, which you will be able to access from within your app's server side javascript code. For example, if you add a config section as follows:

    {
      "myAppCustomConfigSection": {
        "something": "123"
      }
    }

You would then be able to access that within one of your widget's .server.js file like so:

    exports.getWidget = function(feather, cb) {
      if (feather.appOptions.myAppCustomConfigSection.something === "123") {
        //do something based on the custom config value
      }

      cb(null, {
        name: "myApp.someWidget",
        path: "widgets/someWidget/"
      });
    };

It's also important to note the order of config option overriding. The first level are the system defaults, mentioned above in the large code block. Any section you define in your app's `config.json` file that matches the name of a default section will override all values for that section (i.e. your section is the one that wins). The next level of overriding happens when you have defined an environment within your app's `config.json` files under the `"environments`" section. The same rule applies here... any section under the currently running environment's section will override the top level defaults. The final level of overriding happens from the command line. Any options used when you issue your `feather run` command will override the approriate options from the config.json file.

EXAMPLE: You have a config.json file that looks like this:
    
    {
      "ssl": {
        "enabled": false
      },

      "someCustomConfigSection": {
        "something": {
          "nestedSomething": "abc",
          "nestedTwo": "123"
        }
      },

      "environments": {
        "prod": {
          "host": "www.somewebsite.com",

          "socket.io": {
            "host": "www.somewebsite.com",
            "port": 8989
          },

          "someCustomConfigSection": {
            "something": {
              "nestedTwo": "xyz"
            }
          },

          "daemon": {
            "outputPath": "/logs/myapp.out",
            "pidPath": "/feather_pids/myapp.pid",
            "runAsUser": "feather"
          },

          "resources": {
            "publish": {
              "consolidate": true,
              "minify": true,
              "gzip": true
            }
          },

          "ssl": {
            "enabled": true,
            "key": "/ssl/my_ssl.pem",
            "cert": "/ssl/my_ssl-cert.pem",
            "useRedirectServer": true,
            "redirectServerPort": 80
          }
        }
      }
    }

Now let's look at the behavior of running the app using a couple different commands:
  
  - `feather run`: This will result in the app running with `feather.appOptions.ssl.enabled` being `false`, `feather.appOptions.someCustomConfigSection.something.nestedSomething` being `"abc"` and `feather.appOptions.someCustomConfigSection.something.nestedTwo` being `"123"`. Also, the system defaults of `host` = `localhost`, `socket.io.host` = `localhost`, `socket.io.port` = `8081`, and so forth... and finally, the app will _not_ be running as a daemon.
  - `feather run -e prod`: This will result in the app running with `feather.appOptions.ssl.enabled` being `true` (with a shim redirect server running on port 80 to redirect all traffic from port 80 to the default ssl port of 443), `feather.appOptions.someCustomConfigSection.something.nestedSomething` being `"abc"` and `feather.appOptions.someCustomConfigSection.something.nestedTwo` being `"xyz"` (notice the overriding for this section will leave the default values in tact for any values not defined in the custom environment). Also, `host` = `www.somewebsite.com`, `socket.io.host` = `www.somewebsite.com`, `socket.io.port` = `8989`, and so forth... and finally, the app will _still_ _not_ be running as a daemon.
  - `feather run -e prod -z`: All of the above will be applied, and the app will be run as a daemon under the system user `feather` (assuming you have such a user on your machine), with the output and pid paths as specified in the config file.
