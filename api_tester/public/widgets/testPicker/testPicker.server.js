feather.ns("api_tester");

var fs = require("fs");
var path = require("path");

var configPath = path.join(feather.appOptions.appRoot, "tests.json");
function getTests() {
  var tests = eval("(" + fs.readFileSync(configPath) + ")");
  return tests;
}

api_tester.testPicker = feather.widget.create({
  name: "api_tester.testPicker",
  path: "widgets/testPicker/",
  prototype: {
    initialize: function($super, options) {
      $super(options);
      this.tests = getTests();
    },
    onRender: function() {
      this.scripts.push("widget.tests = " + JSON.stringify(this.tests) + ";");
    }
  }
});