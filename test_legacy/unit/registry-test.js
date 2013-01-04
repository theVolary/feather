(function() {
  var Y = this.YUITest || require("yuitest"),
  util = require("util"),
  Registry = require("../../lib/registry"),
  _ = require("underscore")._;

  var suite = new Y.TestSuite("Registry Tests");

  suite.add(new Y.TestCase({
    name:"Adding and Removing Items",

    setUp: function() {
      this.registry = new Registry();
    },
    tearDown: function() {
      this.registry.dispose();
      delete this.counter;
    },

    testAddingItem: function() {
      var item1 = {id: "item1"};
      var added = this.registry.add(item1);
      Y.Assert.areEqual(added, true, "item should have been added");
      Y.Assert.areEqual(this.registry.items.length, 1, "this.registry.items.length should be 1");
      Y.Assert.areSame(this.registry.items[0], item1, "items should be the same");
    },

    testAddingDuplicateItems: function() {
      var item1 = {id: "item1"};
      var item2 = {id: "item1"};
      this.registry.add(item1);
      try {
        this.registry.add(item2);
      } catch (ex) {
        var err = "Error: All items in this registry instance must have unique IDs.... id: item1";
        Y.Assert.areEqual(ex.message, err, "no duplicate ids allowed");
      }
    },

    testAddRange: function() {
      var items = [
        {id: "item1"},
        {id: "item2"}
      ];
      var more_items = [
        {id: "item3"},
        {id: "item4"}
      ];
      this.registry.addRange(items);
      Y.Assert.areEqual(this.registry.items.length, 2, "first addRange: this.registry.items.length should be 2");
      Y.Assert.areSame(this.registry.items[0], items[0], "first addRange: items should be the same");

      this.registry.addRange(more_items);
      Y.Assert.areEqual(this.registry.items.length, 4, "second addRange: this.registry.items.length should be 4");
      Y.Assert.areSame(this.registry.items[2], more_items[0], "second addRange: items should be the same");
    },

    testRemovingItem: function() {
      var item1 = {id: "item1"};
      this.registry.add(item1);
      Y.Assert.areEqual(this.registry.items.length, 1, "this.registry.items.length should be 1");
      Y.Assert.areSame(this.registry.items[0], item1, "items should be the same");
      var removed = this.registry.remove(item1);
      Y.Assert.areEqual(removed, true, "item should have been removed");
      Y.Assert.areEqual(this.registry.items.length, 0, "this.registry.items.length should be 0");
    },

    testCustomIdKey: function() {
      this.registry.options.idKey = "my_id";
      var item1 = {my_id: "item1"};
      var added = this.registry.add(item1);
      Y.Assert.areEqual(added, true, "item should have been added");
      Y.Assert.areEqual(this.registry.items.length, 1, "this.registry.items.length should be 1");
      Y.Assert.areSame(this.registry.items[0], item1, "items should be the same");
    },

    testFindById: function() {
      var item1 = {id: "item1"};
      var added = this.registry.add(item1);
      Y.Assert.areEqual(added, true, "item should have been added");
      Y.Assert.areEqual(this.registry.items.length, 1, "this.registry.items.length should be 1");
      Y.Assert.areSame(this.registry.items[0], item1, "items should be the same");
      var foundItem = this.registry.findById("item1");
      Y.Assert.areSame(this.registry.items[0], foundItem, "items should be the same");
      Y.Assert.areSame(item1, foundItem, "items should be the same");
    }

  }));

  suite.add(new Y.TestCase({
    name:"Registry Events",

    setUp: function() {
      this.registry = new Registry();
    },
    tearDown: function() {
      this.registry.dispose();
      delete this.counter;
    },

    testItemAdded: function() {
      var test = this;
      var item1 = {id: "item1"};
      this.registry.on("itemAdded", function(item) {
        Y.Assert.areEqual(test.registry.items.length, 1, "test.registry.items.length should be 1");
        Y.Assert.areSame(test.registry.items[0], item, "items should be the same");
        Y.Assert.areSame(item1, item, "items should be the same");
      });
      this.registry.add(item1);
    },

    testItemAddedInRange: function() {
      var test = this;
      var items = [
        {id: "item1"},
        {id: "item2"}
      ];
      var added_items = [];
      this.registry.on("itemAdded", function(item) {
        added_items.push(item);
      });
      this.registry.addRange(items);
      Y.Assert.areEqual(added_items.length, 2, "added_items.length should be 2");
      Y.Assert.areSame(test.registry.items[0], added_items[0], "items should be the same");
      Y.Assert.areSame(test.registry.items[1], added_items[1], "items should be the same");
    },

    testItemRemoved: function() {
      var test = this;
      var item1 = {id: "item1"};
      this.registry.on("itemRemoved", function(item) {
        Y.Assert.areEqual(test.registry.items.length, 0, "test.registry.items.length should be 0");
        Y.Assert.areSame(item1, item, "items should be the same");
      });
      this.registry.add(item1);
      this.registry.remove(item1);
    },

    testCleared: function() {
      var test = this;
      var items = [
        {id: "item1"},
        {id: "item2"}
      ];
      this.registry.on("cleared", function() {
        Y.Assert.areEqual(test.registry.items.length, 0, "test.registry.items.length should be 0");
      });
      this.registry.addRange(items);
      this.registry.removeAll();
    },

    testClearFiresItemRemoved: function() {
      var test = this;
      var items = [
        {id: "item1"},
        {id: "item2"}
      ];
      var counter = 0;
      this.registry.on("itemRemoved", function() {
        counter++;
      });
      this.registry.addRange(items);
      this.registry.removeAll();
      Y.Assert.areEqual(2, counter, "itemRemoved event should have fired two times");
    }

  }));

  Y.TestRunner.add(suite);
})();