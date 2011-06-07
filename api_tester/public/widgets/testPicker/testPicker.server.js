var fs = require("fs"),
   path = require("path");


function getTests(path) {
  var tests = eval("(" + fs.readFileSync(configPath) + ")");
  return tests;
}

exports.getWidget = function(appOptions, cb) {
  var configPath = path.join(appOptions.appRoot, "tests.json");

  cb(null, {
    name: "api_tester.testPicker",
    path: "widgets/testPicker/",
    prototype: {
      init: function(options) {
        api_tester.testPicker.super.apply(this, arguments);
        this.tests = getTests(configPath);
      },
      onRender: function() {
        this.scripts.push("widget.tests = " + JSON.stringify(this.tests) + ";");
      }
    }
  });
};