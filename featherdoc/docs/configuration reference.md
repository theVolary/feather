# feather Configuration Reference #

_Note:_ default values for various options are given in square brackets after the option name.

## useAjaxForSystem [true]

When true, feather uses traditional XHR (via jQuery) to make async system calls (RPC methods, etc) to the server. When false, feather will use socket.io for these communications (so you must also enable socket.io in this case).

## cluster [false]

When true, the feather process will automatically cluster itself across all available cores on the machine (as reported by node's os.cpus().length). When false, only one feather process will run. 

## host

TODO: Fill in description

## socket.io

* enabled - [false] true / false.  Enables or disables socket.io in your application.
* port [8081] - The port the socket io server will listen on.  Defaults to 8081.
* host [localhost] - TODO: Fill in description

## socketOptions

* log level [1] - The socket io log level.  0 = error, 1 = warn, 2 = info, 3 = debug

## auth

* enabled [false] - Enable or disable auth support in your app.
* userIdPrefix [org.couchdb.user:] - A prefix to which usernames will be appended when checking the database.

## ssl

* enabled [false] - Whether or not ssl is enabled in your app.
* key [] - The absolute path to your ssl key file.
* cert [] - The absolute path to your ssl cert file.
* useRedirectServer [true] - Whether or not to start up a redirect server to redirect traffic from another port to the SSL server.
* redirecServerPort [80] - The port the redirect server should listen on.

## daemon

* runAsDaemon [false] - Whether or not feather should daemonize itself after startup.
* outputPath [feather-app.out] - Where to redirect standard out.
* pidPath [/tmp/feather-app.pid] - Where to write the pid file to.
* runAsUser [root] - The user the daemon should run as.

## data

### datalinking

* enabled [true] - Whether or not to enable jQuery data-linking on forms.

### appdb

TODO:

### authdb

## environments

Any properties of this object are considered to be a named environment (e.g. "dev" or "prod").  See the _Applications_ documentation for more details.

## logging

* enabled [true] - Whether or not logging is enabled in the app.
* defaultLevel [all] - The default, or root logging level for the app.
* absorbConsoleLogging [true] - If true, `console.log()` statements will be treated as info-level log statements.

### categories
The properties of the categories config object represent named logging categories.  The values of each property should be a log level.  The available logging levels are: `all, trace, debug, info, warn, error`.


### appenders

Appenders is an array of objects that represent logger appenders.  If you are familiar with log4j or NLog, this is analagous to those frameworks' appender concepts as well.  See the Logging section for more details on appenders.

### templates

Logging templates are developer shortcuts for frequently used logging messages.  The templates config object is an array of objects, with each object being a template with `id` and `template` properties.  For more details, see the Logging section of this documentation.

## resources
TODO: Describe

### publish

TODO: List options

### packages

TODO: List options

## session

### config

* key [feather.sid] - the session cookie name
* secret [feather app key] - the cookie "secret" to use.
  * cookie - object containing cookie config details
  * path [/] - the cookie's path value
  * httpOnly [false] - Whether or not the cookie is an http only cookie.  If you will manipulate the cookie at all in client-side code, set this to false.
  * maxAge [14400000] - The expiration of the cookie, in ms. (Default is 4 hours)
* ignorePaths [/robots.txt] - array of string paths to ignore


## ui
TODO: This section needs more work.

* enabled [true] - whether or not to enable the ui helper layer.
* provider - configures a ui layer provider.  The default contains details for a jquery-ui provider.
* provider.jsFiles - array of string paths to javascript files to include for the provider.
* provider.cssFiles - array of string paths to css files to include for the provider.

----