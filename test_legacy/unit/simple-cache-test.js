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
      cache.deleteAll();
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
    },

    testGetItems: function() {
      var test = this;
      cache.getItems(["item1", "item2"], function(err, _items) {
        if (err) {
          Y.Assert.fail(err);
        } else {
          Y.Assert.areSame(test.item1, _items.item1, "items should be the same");
          Y.Assert.areEqual(test.item2.value, _items.item2.value, "item values should be equal");
        }
      });
    },

    testGetItemWait: function() {
      var test = this;
      var item3 = {};
      cache.getItemWait("item3", function(err, _item) {
        test.resume(function() {
          Y.Assert.areSame(item3, _item, "items should be the same");
        });
      });
      setTimeout(function() {
        cache.setItem("item3", item3);
      }, 500);
      test.wait(1000);
    },

    testGetItemsWait: function() {
      var test = this;
      var item3 = {};
      var item4 = {};
      cache.getItemsWait(["item3", "item4"], function(err, _items) {
        test.resume(function() {
          Y.Assert.areSame(item3, _items.item3, "item3 items should be the same");
          Y.Assert.areSame(item4, _items.item4, "item4 items should be the same");
        });
      });
      setTimeout(function() {
        cache.setItem("item3", item3);
        cache.setItem("item4", item4);
      }, 500);
      test.wait(1000);
    }

  }));

  Y.TestRunner.add(suite);
})();