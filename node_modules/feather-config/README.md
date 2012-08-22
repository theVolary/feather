# feather-config

## Installation
`npm install git://github.com/theVolary/feather-config.git`

## Overview
feather-config is a library useful in bootstrapping feather-like applications with a configuration environment.  It provides multiple layers of inherited configuration, command-line argument support, and helper methods for safely reading configuration options.  Options specified at a particular layer override any options specified at a lower layer.  This is done in a manner so that only the properties specified are overwritten.  For example, given the following default options:

    {
      "host": "localhost",
      "port": 80
    }
and the following app-level options in a file named config.json:

    {
      "host": "www.example.com"
    }
the resulting configuration object will look like this:

    {
      "host": "www.example.com",
      "port": 80
    }
Note that the port property from the default options was not overridden.  This pattern is followed throughout the four layers of inheritance the library supports.  Those layers are, in order of evaluation:

1.  defaults
2.  application
3.  environment
4.  command line options

The following diagram may demonstrate the layering a little better.

![inheritance stack diagram](https://github.com/skrenek/feather-config/raw/master/docs/inheritance_stack.png)

## Configuration Layers

### Default Options
This is the lowest level of options supported.  If you're not building a library, the odds are you won't use this level.  If omitted, `{}` is used.

### App-level options
These options are specified at the application level.  By convention, this is a file named `config.json` stored in the root of your application's file structure.  The location of this file can be overridden.  See the API section for more info.

### Environment-level options
Environment level options provide support for different environments of execution.  Most commonly you see this pattern in web frameworks where you have dev, test, and prod environments.  Environment configurations may be specified within the app-level options in the `environments` property, or in a json file in the app's `conf` folder.  In the latter case, the name of the file minus the extension is used as the name of the environment.

### Command line options
The framework provides a measure of support for command line arguments, by providing a hook that will be called for each argument if the user provides a function to process them.  In this manner, the application only needs to provide the logic of what to do with each argument.  See the `commandLineArgsHook` option of the init method below for more information.

## API
The library itself has just two methods:

----

### init(options, callback)
  This method is used to process configuration options and call back with the final configuration options.
  
#### options
  
* `appDir` - The base directory to use for calculating paths.  Defaults to `process.cwd()`.
* `defaultConfigPath` - path to the default config file.  If omitted, no default config will be used.
* `appConfigPath` - the path to the application's config file.  If omitted, defaults to `appDir + "/config.json"`.
* `defaultOptionsHook` - function the defaultOptions are passed into in case the app wishes to augment them before proceeding.  This is called immediately after the default config file is read, and it _must_ be synchronous.
* `commandLineArgsHook` - function to process individual command line arguments.  It _must_ be synchronous. 

  #### args
  * arg - the current arg being processed
  * remainingArgs - the remainder of the arguments array that follows arg.
  * cmdLineOptions - the command line options object the function should modify.
    
#### callback parameters 
  
  The callback parameters follow the standard nodejs err, result pattern.
  
  * `err` - null unless an error occurred
  * `config` - the resulting configured options
  
The resulting config object returned in init's callback also contains two utility methods:

* `safeGet(path)` - identical to the library-level safeGet below, but acts only on the config object.
* `dumpBuildInfo()` - purely a debug method useful for seeing the levels of inheritance that were followed while constructing the configuration options.  It returns a string.

----

### safeGet(path, object)
This is a utility method to safely retrieve values from the given object without throwing undefined errors if any property in the path does not exist (null-safe get).  If any of the properties in the path variable are not defined, the method returns `null`.

#### parameters
* `path` - The dot-notation path string inside the object that you wish to retrieve.  For example, `"user.profile.address.city"`.
* `object` - the object to _get_ from.

----

## Examples
Typical usage is as follows:

    var fConf = require("feather-config");
    
    fConf.init({}, function(err, config) {
      ...
    });
    
Full usage with all options looks something like this:

    var fConf = require("feather-config");
    
    var confOpts = {
      defaultConfigPath: 'lib/defaults.json',
      defaultOptionsHook: function(defaultOptions) {
        defaultOptions.someRuntimeOption = process.env.MY_VAR;
      },
      appConfigPath: 'myapp.json',
      commandLineArgsHook: function(arg, remainingArgs, cmdLineOptions) {
        if (arg === 'sweetOption') {
          cmdLineOptions.sweetOption = remainingArgs.shift();
        }
      }
    };
    
    fConf.init(confOpts, function(err, config) {
      if (err) {
        ...
      } else {
        var myVal = config.safeGet('some.nested.property');
      }
    });