var fs = require("fs");
var path = require("path");

var configPath = path.join(feather.appOptions.appRoot, "tests.json");
function getTests() {
  var tests = eval("(" + fs.readFileSync(configPath) + ")");
  return tests;
}

exports.widget = {
  name: "api_tester.testPicker",
  prototype: {
    init: function(options) {
      api_tester.testPicker.super.apply(this, arguments);
      this.tests = getTests();
    },
    onRender: function(ctx) {
      ctx.scripts.push("widget.tests = " + JSON.stringify(this.tests) + ";");
    }
  }
};