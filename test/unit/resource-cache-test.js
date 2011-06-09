(function() {
  var Y = this.YUITest || require("yuitest"),
      fs = require("fs"),
      ResourceCache = require("../../lib/resource-cache");

  var rc;
  var testFile = "/tmp/rc-test.txt";
  var initialContent = "Lorem ipsum";
  var newContent = "Lorem ipsum dolor sit amet";

  var tc = new Y.TestCase({
    name:"Resource Cache Tests",

    _should: {
      ignore: {
        testFileBasedComponentChange: false,
        testAddFileBasedComponent: false
      }
    },
    
    setUp: function() {
      rc = new ResourceCache({
        cacheName: "test_cache",
        contentType: "text"
      });
    },
    tearDown: function() {
      // rc.dispose();
      fs.unlinkSync(testFile);
      require("../../lib/filewatcher").unwatchAll(); // clean up and allow us to exit.
    },

    testAddNonFileComponent: function() {
      rc.addComponent('test', 'Lorem ipsum');
      var component = rc.components['test'];
      Y.Assert.isNotNull(component, "No components found after add.");
      Y.Assert.isFalse(component.watching, "Non-file component states that it's watching files for changes.");
      Y.Assert.areEqual('Lorem ipsum', component.content, "Content doesn't match what was added.");
      Y.Assert.areEqual('test', rc.componentOrder[0], "Component order did not get added correctly.");
      
    },

    testAddFileBasedComponent: function() {
      var test = this;
      fs.writeFile(testFile, initialContent, function(err) {
        test.resume(function() {
          rc.addComponent(testFile, initialContent, function(err) {
            test.resume(function() {
              if (err) {
                Y.Assert.Fail("addComponent failed with err " + err);
              }
              var component = rc.components[testFile];
              Y.Assert.isNotNull(component, "No component found after add.");
              Y.Assert.areEqual(initialContent, component.content, "Content doesn't match what was added.");
              Y.Assert.areEqual(testFile, rc.componentOrder[0], "Component order did not get added correctly.");
              Y.Assert.isTrue(component.watching, "File-based component states it is not watching the file for changes.");
              //fs.unlinkSync(testFile);
            });
          });
          test.wait(500);
        });
      });

      test.wait(500);      
    },

    testFileBasedComponentChange: function() {
      var test = this;
      fs.writeFile(testFile, initialContent, function(err) {
        test.resume(function() { // A
          rc.addComponent(testFile, initialContent, function(err) {
            
            test.resume(function() { // B
              rc.on('componentChanged', function(name) {
                test.resume(function() { // C
                  var component = rc.components[testFile];
                  Y.Assert.areEqual(newContent, component.content, "Component content was incorrect after update.");
                });
              });

              test.wait(function() {
                // Update the file after a second so that the mtimes will be different.
                fs.writeFile(testFile, newContent, function(err) {});
                test.wait(5000); // C: wait up to 5s for the componentChanged event to be received.
              }, 1000);
            });

          });
          test.wait(100); // B
        });
      });
      test.wait(100); // A
    },
  });

  Y.TestRunner.add(tc);
})();
