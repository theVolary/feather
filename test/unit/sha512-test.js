(function() {
  require.paths.unshift('./lib');
  require("core").bootstrap();
  require("lang");
  var assert = require("assert"),
      Y = YUITest = this.YUITest || require("yuitest");
  
  require("jojojs-client/sha512");

  var tc = new YUITest.TestCase({
    name: "sha512 sum of 'steve'",
    setUp: function() {
    },
    tearDown: function() {
    },

    testSha512: function() {
      var test = this;
      var expected = "3ea1fe205c3d228ce053d97c29a94476a18d683b70a347693d5eac9ac985c6fdb556985fc8fc17bf1e9f8980cef3340ce62760f21d14a5c9eed43424d6359e72";
      Y.Assert.areEqual(expected, jojo.data.auth.hash('steve'), "Hashes do not match.");
    }
  });
  YUITest.TestRunner.add(tc);
})();