(function() {
  var Y = this.YUITest || require("yuitest"),
  DomResource = require("../../lib/dom").DomResource,
  DomPool = require("../../lib/dom").DomPool,
  _ = require("underscore")._;

  var suite = new Y.TestSuite("DomResource Tests");

  suite.add(new Y.TestCase({
    name:"Test Case 1",

    setUp: function() {

    },

    tearDown: function() {

    },

    testDOMReadyState: function() {
      var test = this;
      var dom = new DomResource({
        onceState: {
          ready: function() {
            test.resume(function() {
              if (!dom.$ || !dom.window || !dom.document || !dom.jQuery || !dom.$.tmpl) {
                Y.Assert.fail("The DOM object was not properly initialized");
              } else {
                Y.Assert.areEqual(1, 1);
              }
            });
          }
        }
      });
      test.wait(2000);
    },

    testDOMManipulation: function() {
      var test = this;
      var dom = new DomResource({
        onceState: {
          ready: function() {
            test.resume(function() {
              dom.$(dom.document.body).append('<div id="test">hello</div>');
              var html = dom.$(dom.document.body).html();
              Y.Assert.areEqual('<div id="test">hello</div>', html, "html fragment mismatch");
            });
          }
        }
      });
      test.wait(2000);
    },

    testTemplating: function() {
      var test = this;
      var dom = new DomResource({
        onceState: {
          ready: function() {
            test.resume(function() {
              var template = "<div id='${id}'>${str}</div>";
              var replacements = {
                id: "test",
                str: "hello"
              };
              dom.$.tmpl(template, replacements).appendTo(dom.document.body);
              var html = dom.$(dom.document.body).html();
              Y.Assert.areEqual('<div id="test">hello</div>', html, "html fragment mismatch");
            });
          }
        }
      });
      test.wait(2000);
    },

    testReset: function() {
      var test = this;
      var dom = new DomResource({
        onceState: {
          ready: function() {
            test.resume(function() {
              dom.$(dom.document.body).append('<div id="test">hello</div>');
              var html = dom.$(dom.document.body).html();
              Y.Assert.areEqual('<div id="test">hello</div>', html, "html fragment mismatch");
              dom.reset();
              html = dom.$(dom.document.body).html();
              Y.Assert.areEqual('', html, "html should have been reset");
            });
          }
        }
      });
      test.wait(2000);
    }

  }));

  Y.TestRunner.add(suite);
})();