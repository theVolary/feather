(function() {
  var Y = this.YUITest || require("yuitest"),
  _ = require("underscore")._;

  var suite = new Y.TestSuite("Widget Rendering Tests");

  suite.add(new Y.TestCase({
    name:"Test 1",

    setUp: function() {

    },

    tearDown: function() {

    }

  }));

  Y.TestRunner.add(suite);
})();