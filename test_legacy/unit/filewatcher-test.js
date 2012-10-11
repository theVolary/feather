(function() {
  var Y = this.YUITest || require("yuitest"),
      FW = require("../../lib/filewatcher"),
      exec = require("child_process").exec,
      fs = require("fs");

  var testFile = "/tmp/fw-tests.txt";
  //FW.setFileWatchInterval(1);

  function touchFile(cb) {
    //exec("touch -m "+testFile, cb);
    fs.writeFile(testFile, "test", cb);
    //console.log("touch file ending mtime is " + fs.statSync(testFile).mtime.getTime());
  }

  var tc = new Y.TestCase({
    name:"File Watcher Tests",

    setUp: function() {
      //console.log("setUp");
      fs.writeFileSync(testFile, "test");
    },
    tearDown: function() {
      //console.log("tearDown");
      fs.unlinkSync(testFile);
      FW.unwatchAll();
    },

    testAddWatcher: function() {
      var cb = function(args) {};
      var cb2 = function(args) {};
      FW.watchFile(testFile, cb);
      Y.Assert.areEqual(1, FW.watchers.items.length, "No watchers found.");
      Y.Assert.areEqual(1, FW.watchers.items[0].listeners("filemodified").length, "No listeners found on watcher.");
      Y.Assert.areSame(cb, FW.watchers.items[0].listeners("filemodified")[0], "Listener callback is not the one we submitted.");

      FW.watchFile(testFile, cb2);
      Y.Assert.areEqual(1, FW.watchers.items.length, "Adding a 2nd watcher to a file should still result in 1 watcher.");
      Y.Assert.areEqual(2, FW.watchers.items[0].listeners("filemodified").length, "Multiple listeners should exist in the watcher.");

      FW.unwatchFile(testFile, cb);
      FW.unwatchFile(testFile, cb2);
    },

    testRemoveWatcher: function() {
      var cb = function(args) {};
      FW.watchFile(testFile, cb);
      FW.unwatchFile(testFile, cb);
      Y.Assert.areEqual(0, FW.watchers.items.length, "Expected the watcher to have been removed and disposed.");
    },

    testUnwatchAll: function() {
      var cb = function(args) {};
      var cb2 = function(args) {};
      FW.watchFile(testFile, cb);
      FW.watchFile(testFile, cb2);
      FW.watchFile("/tmp/fw-test2.txt", cb);
      Y.Assert.areEqual(2, FW.watchers.items.length, "Watchers did not get added correctly.");
      FW.unwatchAll();
      Y.Assert.areEqual(0, FW.watchers.items.length, "Watchers still exist.");
    },

    // testTriggerFileEvent: function() {
    //   console.log("Running testTriggerFileEvent.  mtime is " + fs.statSync(testFile).mtime.getTime());
    //   fs.writeFileSync("/tmp/mytest.txt", "test");
    //   var counter = 0;
    //   var test = this;
    //   var cb = function(args) {
    //     console.log("Incrementing counter on " + testFile + " at " + new Date());
    //     counter += 1;
    //     // test.resume(function() {
    //     //   Y.Assert.areEqual(1, counter, "Watch event did not fire correctly.");
    //     // });
    //   };
    //   console.log("Watching test file");
    //   FW.watchFile("/tmp/mytest.txt", cb);
    //   //touchFile(function(err, stdout, stderr) {});
      
    //   fs.writeFileSync("/tmp/mytest.txt", "test2");
    //   console.log("Waiting 5 seconds at " + new Date());
    //   //test.wait(5000);
    //   test.wait(function() {
    //     Y.Assert.areEqual(1, counter, "Boo.");
    //   }, 5000);
    // }
  });

  Y.TestRunner.add(tc);
})();