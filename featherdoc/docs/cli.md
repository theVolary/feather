# feather CLI (Command Line Interface) Documentation #

## Usage ##
feather incorporates a CLI for executing commands.  

The basic usage scenario is: 

`feather [OPTIONS] command [ARGS]`

To get a list of all commands and some help about them type:

`feather help`  or `feather help [command name]`

## Options ##

### Common Options ###
Options have both a long and short form.  The long form consists of two dashes and the option name (e.g. `--verbose`).  The short form consists of a single dash and a single character (e.g. `-V`).

A few options are common to all commands.  They are: 

* `--path / -p` - the path to the application to apply this command to.  If omitted, defaults to the current dir.
* `--verbose / -V` - display verbose output from the CLI.
* `--help / -h` - display help and usage details

All other options are specific to one or more commands and are covered in the documentation for those commands.

## Commands ##

### create-app ###
Creates a new feather application in the specified directory.  

#### Usage ####
`feather [OPTIONS] create-app [NAME]`

If NAME is omitted, the current directory is assumed, but it will prompt you for confirmation.

#### Options ####
No specialized options available.

----

### create-rest ###

Creates a new RESTful api source file in the application's `rest` folder.

#### Usage ####
`feather [OPTIONS] create-rest restApiName`

_restApiName_ is required and is the name of both the file created and the endpoint of the api.  For example, specifying `feather create-rest person` will result in the creation of `APP_FOLDER/rest/person.js`, and the URI endpoint `/_rest/person`.

----

### create-widget ###

Creates a new widget in a feather app.  Widgets' files are placed in the `public/widgets/` folder of the application.

#### Usage ####

`feather [OPTIONS] create-widget [namespace] widgetName`

_namespace_ is optional.  By default, the name of the application is used as the namespace.

_widgetName_ is required.  

#### Options ####

    --client-only (-c): Indicates that the created widget is a client-side rendered widget (has no .server.js file)

----

### help ###

Displays general help, or help on a specific command.

#### Usage ####

`feather help [command]`

----

### run ###
Runs a feather app.

#### Usage ####
`feather [OPTIONS] run`

If the path option is omitted, the default is attempted.

#### Options ####
    --daemonize (-z): (run command only) - Daemonize this server so it runs in the background
    --debug (-d): (run command only) - Starts the app in debug mode (i.e. "node debug")
    --debug-inspector (-D): (run command only) - Starts the app in debug mode and hosts node-inspector on port 8888
    --env (-e): (run command only) - The environment to run in (e.g. dev, prod)
    --loglevel (-l): (run command only) - The default logging level to use.  Options are: all, trace, debug, info, warn, error, off
    --outputpath (-o): (run command only) - Path to write std output to when running as a daemon.  Default is feather-app.out.
    --pidpath (-i): (run command only) - The path of the pid file to use when running as a daemon.  Default is /tmp/feather-app.pid.

_NOTE:_ Most of the options above can also be specified in the app's config file.  They are permitted as CLI options purely for convenience.

----