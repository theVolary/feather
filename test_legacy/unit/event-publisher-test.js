(function() {
  var Y = this.YUITest || require("yuitest"),
  util = require("util"),
  EventPublisher = require("../../lib/event-publisher"),
  _ = require("underscore")._;

  var suite = new Y.TestSuite("Event Publisher Tests");

  suite.add(new Y.TestCase({
    name:"Event Publisher Basics",

    setUp: function() {
      this.counter = 0;
    },
    tearDown: function() {
      delete this.counter;
    },

    testFireListen: function() {
      var test = this;
      var publisher = new EventPublisher();
      publisher.on("test", function() {
        test.counter++;
      });
      publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      publisher.fire("test");
      publisher.fire("test");
      Y.Assert.areEqual(3, test.counter);
    },

    testConstructorWiring: function() {
      var test = this;
      var publisher = new EventPublisher({
        on: {
          test: function() {
            test.counter++;
          }
        }
      });
      publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      publisher.fire("test");
      publisher.fire("test");
      Y.Assert.areEqual(3, test.counter);
    },

    testOnce: function() {
      var test = this;
      var publisher = new EventPublisher();
      publisher.once("test", function() {
        test.counter++;
      });
      publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      publisher.fire("test");
      publisher.fire("test");
      Y.Assert.areEqual(1, test.counter, "Listener should have only been called once.");
    },

    testConstructorOnce: function() {
      var test = this;
      var publisher = new EventPublisher({
        once: {
          test: function() {
            test.counter++;
          }
        }
      });
      publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      publisher.fire("test");
      publisher.fire("test");
      Y.Assert.areEqual(1, test.counter, "Listener should have only been called once.");
    },

    testSingleSender: function() {
      var test = this;
      var sender1 = new EventPublisher({
        on: {
          test: function(sender) {
            Y.Assert.areSame(sender, sender1);
          }
        }
      });
      sender1.fire("test");
    },

    testSingleSenderWithArguments: function() {
      var test = this;
      var sender1 = new EventPublisher({
        on: {
          test: function(arg1, arg2, _sender) {
            Y.Assert.areSame(arg1, 1);
            Y.Assert.areSame(arg2, 2);
            Y.Assert.areSame(_sender, sender1);
          }
        }
      });
      sender1.fire("test", 1, 2);
    }

  }));

  suite.add(new Y.TestCase({
    name: "Disposable Auto Cleanup",

    setUp: function() {
      this.counter = 0;
    },

    tearDown: function() {
      delete this.counter;
    },

    testCleanup: function() {
      var test = this;
      var publisher = new EventPublisher();
      var disposable = new EventPublisher();
      publisher.on("test", function() {
        test.counter++;
        }, disposable);      
      publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      disposable.dispose();
      publisher.fire("test");
      Y.Assert.areEqual(1, test.counter, "Disposal of 'disposable' should have cleaned up the listener before the fire happened.");
    }
  }));

  suite.add(new Y.TestCase({
    name: "Suppression API Basics",

    setUp: function() {
      var test = this;
      test.counter = 0;
      test.publisher = new EventPublisher();
      test.publisher.on("test", function(amount, testString) {
        if (isNaN(amount)) amount = 1;
        test.counter += amount;
        test.testString = testString;
      });
    },

    tearDown: function() {
      this.publisher.dispose();
      delete this.publisher;
      delete this.counter;
    },

    testSimpleSuppression: function() {
      var test = this;
      test.publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      test.publisher.suppress("test");
      test.publisher.fire("test");
      test.publisher.fire("test");      
      test.publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
    },

    testSimpleUnsuppression: function() {
      var test = this;
      test.publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      test.publisher.suppress("test");
      test.publisher.fire("test");
      test.publisher.fire("test");      
      test.publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      test.publisher.unsuppress("test");
      test.publisher.fire("test");
      Y.Assert.areEqual(2, test.counter);
    },

    testSimpleSuppressOnce: function() {
      var test = this;
      test.publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      test.publisher.suppressOnce("test");
      test.publisher.fire("test");
      test.publisher.fire("test");      
      test.publisher.fire("test");
      Y.Assert.areEqual(3, test.counter);
    },

    testBuffering1: function() {
      var test = this;
      test.publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      test.publisher.suppress("test", true); //true = buffer suppressed events
      test.publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      Y.Assert.areEqual(1, test.publisher._buffer.length);
      test.publisher.fire("test");
      Y.Assert.areEqual(1, test.counter);
      Y.Assert.areEqual(2, test.publisher._buffer.length);    
      test.publisher.unsuppress("test");
      Y.Assert.areEqual(3, test.counter, "2 events should have been buffered and re-emitted after unsuppression.");
    },

    testBufferingWithArguments: function() {
      var test = this;
      test.publisher.fire("test", 1, "foo1");
      Y.Assert.areEqual(1, test.counter);
      Y.Assert.areEqual("foo1", test.testString);
      test.publisher.suppress("test", true); //true = buffer suppressed events
      test.publisher.fire("test", 50, "foo2");
      Y.Assert.areEqual(1, test.counter);
      Y.Assert.areEqual("foo1", test.testString);
      Y.Assert.areEqual(1, test.publisher._buffer.length);
      test.publisher.fire("test", 50, "foo3");
      Y.Assert.areEqual(1, test.counter);
      Y.Assert.areEqual("foo1", test.testString);
      Y.Assert.areEqual(2, test.publisher._buffer.length);    
      test.publisher.unsuppress("test");
      Y.Assert.areEqual(101, test.counter);
      Y.Assert.areEqual("foo3", test.testString);
    }

  }));

  suite.add(new Y.TestCase({
    name: "Suppression API Advanced Usage",

    setUp: function() {
      var test = this;
      test.array = [];
      test.publisher = new EventPublisher();
      function pushnum(num) {
        if (num === 0) {
          test.publisher.suppress("test1", true);
        } else {
          test.array.push(num);
        }
      }
      test.publisher.on("test1", pushnum);
      test.publisher.on("test2", pushnum);
    },

    tearDown: function() {
      this.publisher.dispose();
      delete this.publisher;
      delete this.array;
    },

    testBufferingMultipleEvents: function() {
      var test = this;
      test.publisher.fire("test1", 1);
      test.publisher.fire("test2", 2);
      Y.Assert.areEqual("1,2", test.array.join(","));
      test.publisher.suppress(["test1", "test2"], true);
      test.publisher.fire("test1", 3);
      test.publisher.fire("test2", 4);
      test.publisher.fire("test1", 5);
      test.publisher.fire("test2", 6);
      Y.Assert.areEqual("1,2", test.array.join(","));
      test.publisher.unsuppress();
      Y.Assert.areEqual("1,2,3,4,5,6", test.array.join(","));
    },

    testBufferingWithRebuffering: function() {
      var test = this;
      test.publisher.fire("test1", 1);
      test.publisher.fire("test2", 2);
      Y.Assert.areEqual("1,2", test.array.join(","));
      test.publisher.suppress(["test1", "test2"], true);
      test.publisher.fire("test1", 0);
      test.publisher.fire("test2", 4);
      test.publisher.fire("test1", 5);
      test.publisher.fire("test2", 6);
      Y.Assert.areEqual("1,2", test.array.join(","));
      test.publisher.unsuppress();
      Y.Assert.areEqual("1,2,4,6", test.array.join(","));
      test.publisher.unsuppress();
      Y.Assert.areEqual("1,2,4,6,5", test.array.join(","));
    },

    testSubsetUnsuppressionBuffering: function() {
      var test = this;
      test.publisher.fire("test1", 1);
      test.publisher.fire("test2", 2);
      Y.Assert.areEqual("1,2", test.array.join(","));
      test.publisher.suppress(["test1", "test2"], true);
      test.publisher.fire("test1", 3);
      test.publisher.fire("test2", 4);
      test.publisher.fire("test1", 5);
      test.publisher.fire("test2", 6);
      Y.Assert.areEqual("1,2", test.array.join(","));
      test.publisher.unsuppress("test2");
      Y.Assert.areEqual("1,2,4,6", test.array.join(","));
    },

    testBufferingAllEvents: function() {
      var test = this;
      test.publisher.fire("test1", 1);
      test.publisher.fire("test2", 2);
      Y.Assert.areEqual("1,2", test.array.join(","));
      test.publisher.suppress(null, true);
      test.publisher.fire("test1", 3);
      test.publisher.fire("test2", 4);
      test.publisher.fire("test1", 5);
      test.publisher.fire("test2", 6);
      Y.Assert.areEqual("1,2", test.array.join(","));
      test.publisher.unsuppress();
      Y.Assert.areEqual("1,2,3,4,5,6", test.array.join(","));
    },

    testUnsuppressionWithBypassRefiring: function() {
      var test = this;
      test.publisher.fire("test1", 1);
      test.publisher.fire("test2", 2);
      Y.Assert.areEqual("1,2", test.array.join(","));
      test.publisher.suppress(null, true);
      test.publisher.fire("test1", 3);
      test.publisher.fire("test2", 4);
      test.publisher.fire("test1", 5);
      test.publisher.fire("test2", 6);
      Y.Assert.areEqual("1,2", test.array.join(","));
      test.publisher.unsuppress(null, true);
      Y.Assert.areEqual("1,2", test.array.join(","));
    }

  }));

  Y.TestRunner.add(suite);
})();