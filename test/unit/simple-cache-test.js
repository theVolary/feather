(function() {
  var Y = this.YUITest || require("yuitest"),
  cache = require("../../lib/simple-cache"),
  uuid = require("node-uuid"),
  _ = require("underscore")._;

  var suite = new Y.TestSuite("Simple Cache Tests");

  suite.add(new Y.TestCase({
    name:"Test Case 1",

    setUp: function() {
      this.item1 = {value: "item1"};
      this.item2 = {value: "item2"};
      this.token = uuid();
      cache.setItem("item1", this.item1);
      cache.setItemReadOnly("item2", this.item2, this.token);
    },

    tearDown: function() {
      cache.deleteItem("item1");
      cache.deleteItemReadOnly("item2", this.token);
      delete this.item1;
      delete this.item2;
      delete this.token;
    },

    testAddingAndFetching: function() {
      var test = this;
      cache.getItem("item1", function(err, _item) {
        if (err) {
          Y.Assert.fail(err);
        } else {
          Y.Assert.areSame(test.item1, _item, "items should be the same");
        }
      });
    },

    testMemorySharing: function() {
      var test = this;
      cache.getItem("item1", function(err, _item) {
        if (err) {
          Y.Assert.fail(err);
        } else {
          _item.newvalue = "newvalue";
          cache.getItem("item1", function(err, __item) {
            Y.Assert.areEqual("newvalue", __item.newvalue, "Memory sharing should be enabled for non-readonly items.");
          });
        }
      });
    },

    testReadOnlySecurity: function() {
      var test = this;
      cache.setItem("item2", {value: "this shouldn't be allowed"}, function(err) {
        if (!err) {
          Y.Assert.fail("setting item2 should have failed because it was originally set as readonly");
        } else {
          cache.getItem("item2", function(err, _item) {
            Y.Assert.areNotSame(test.item2, _item, "items should NOT be the same");
            Y.Assert.areEqual(test.item2.value, "item2");
          });
        }
      });
    },

    testMemorySharingReadOnly: function() {
      var test = this;
      cache.getItem("item2", function(err, _item) {
        if (err) {
          Y.Assert.fail(err);
        } else {
          _item.newvalue = "newvalue";
          cache.getItem("item2", function(err, __item) {
            Y.Assert.areSame(undefined, __item.newvalue, "Memory sharing should NOT be enabled for readonly items.");
          });
        }
      });
    }

  }));

  Y.TestRunner.add(suite);
})();