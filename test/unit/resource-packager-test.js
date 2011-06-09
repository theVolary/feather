(function() {
  var Y = this.YUITest || require("yuitest"),
      rp = require("../../lib/resource-packager");

  var tc = new Y.TestCase({
    name:"Resource Packager Tests",
    
    setUp: function() {},
    tearDown: function() {},

    testResolveCssUrl: function() {
      var content = [
        "src: url(/fonts/somefile.ttf);",
        "background-image: url('/img/f.gif');",
        "  background-image: url(\"/images/arrow_refresh.png\");",
        "background-image: url(\"../images/myimg.png\");",
        "background-image: url('../res/something.png');",
        "src: url(../../fonts/anotherfont.otf);",
        "background-image: url(i.jpg);"
      ]

      var expected = [
        "src: url(/fonts/somefile.ttf);",
        "background-image: url('/img/f.gif');",
        "  background-image: url(\"/images/arrow_refresh.png\");",
        "background-image: url(\"/widgets/images/myimg.png\");",
        "background-image: url('/widgets/res/something.png');",
        "src: url(/fonts/anotherfont.otf);",
        "background-image: url(/widgets/mywidget/i.jpg);"
      ]

      var newContent;
      var widgetCss = "/home/someuser/apps/featherapp/public/widgets/mywidget/mywidget.css";
      for (var i = 0; i < content.length; i++) {
        newContent = rp.resolveCssUrls(widgetCss, content[i]);
        Y.Assert.areEqual(expected[i], newContent);
      }
      newContent = rp.resolveCssUrls(widgetCss, content.join('\n'));
      Y.Assert.areEqual(expected.join('\n'), newContent, "Multiline test failed.");
    }
  });

  Y.TestRunner.add(tc);
})();