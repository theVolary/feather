var fs = require("fs"),
   path = require("path");


function getTests(path) {
  var tests = eval("(" + fs.readFileSync(path) + ")");
  return tests;
}

exports.getWidget = function(feather, cb) {
  var configPath = path.join(feather.appOptions.appRoot, "tests.json");
  
  cb(null, {
    name: "api_tester.testPicker",
    path: "widgets/testPicker/",
    prototype: {

      onInit: function(options) {
        this.tests = getTests(configPath);
      },

      onRender: function(render) {
        this.scripts.push("widget.tests = " + JSON.stringify(this.tests) + ";");

        render();
      }
    }
  });
};