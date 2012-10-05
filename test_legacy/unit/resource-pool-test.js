(function() {
  var Y = this.YUITest || require("yuitest"),
  ResourcePool = require("../../lib/resource-pool"),
  base = require("../../lib/base-class"),
  _ = require("underscore")._,
  inherits = require("inherits");

  var suite = new Y.TestSuite("ResourcePool Tests");

  suite.add(new Y.TestCase({
    name:"Test 1",

    setUp: function() {
      this.pool = new ResourcePool({
        min: 2,
        max: 5,
        createResource: function() {
          return new base();
        }
      });
    },

    tearDown: function() {
      this.pool.dispose();
      delete this.pool;
    },

    testInit: function() {
      Y.Assert.areEqual(2, this.pool.items.length, "pool should have been initialized with 2 items");
    },

    testUpperLimit: function() {
      var test = this;
      for (var i = 0, l = 10; i < l; i++) {
        (function(index) {
          test.pool.getResource(function(resource) {
            if (index >= 5) {
              Y.Assert.fail("only 5 total resources should have been allocated");
            }
          });
        })(i);        
      }
      Y.Assert.areEqual(5, test.pool.items.length, "pool should only have created a total of 5 resources");
    },

    testReleasing: function() {
      var test = this;
      var counter = 0;
      for (var i = 0, l = 10; i < l; i++) {
        (function(index) {
          test.pool.getResource(function(resource) {
            counter++;
            if (counter == 10) {
              test.resume(function() {
                Y.Assert.areEqual(1, 1);
              });
            } else if (index < 5) {
              setTimeout(function() {
                test.pool.release(resource);
              }, 20);
            }
          });
        })(i);        
      }
      test.wait(2000);
    }

  }));

  Y.TestRunner.add(suite);
})();