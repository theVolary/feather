# Testing feather Apps #
## Writing Tests ##
Each app should have a test folder with two folders inside: unit, and integration.  Currently there is no distinction between the two types of tests in the framework, but in the future there will/should be.  Any javascript file within this folder structure can be considered a test by the framework.  Tests should implement the module pattern `(function() {})();`, and should use YUITest features within.  See the file test/unit/blogapi-test.js in the blog sample app for an example.

## Running Tests ##
The bin folder of the feather framework contains a shell-executable node script that can be used to run tests.  This script starts the user's application, and when it is in the ready state, starts executing tests.  By having the server running, this allows all features of a feather app to be tested.  Script usage is as follows:  
  
`cd $feather_HOME`  
`bin/yuitest app-name [options] test-folder-path`  
_for example_  
`bin/yuitest blog --format junitxml blog/test/unit/*` will run the tests for the blog sample app.