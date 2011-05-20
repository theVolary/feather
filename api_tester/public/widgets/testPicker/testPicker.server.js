feather.ns("api_tester");

var fs = require("fs");
var path = require("path");

var testDir = path.join(feather.appOptions.appRoot, "public", "tests");
function getTests() {
  var files = fs.readdirSync(testDir);
  var fileObjects = [];
  files.each(function(file) {
    fileObjects.push({
      name: file
    });
  });
  return fileObjects;
}

api_tester.testPicker = feather.widget.create({
  name: "api_tester.testPicker",
  path: "widgets/testPicker/",
  prototype: {
    initialize: function($super, options) {
      $super(options);
      this.tests = getTests();
    }
  }
});