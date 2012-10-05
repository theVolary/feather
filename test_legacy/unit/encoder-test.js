(function() {
  var Y = this.YUITest || require("yuitest"),
      Encoder = require("../../lib/encoder");
  var encoder;
  var tc = new Y.TestCase({
    name:"Encoder Tests",
    
    setUp: function() {
      encoder = new Encoder();
    },
    tearDown: function() {
      delete encoder;
    },

    testEncoderType: function() {
      Y.Assert.areEqual("entity", encoder.encodeType, "Default encode type is incorrect.");
    },
    testIsEmpty: function() {
      var val;
      Y.Assert.isTrue(encoder.isEmpty(val), "Undefined check failed.");
      val = null;
      Y.Assert.isTrue(encoder.isEmpty(val), "null check failed.");
      val = "";
      Y.Assert.isTrue(encoder.isEmpty(val), "empty string check failed.");
      val = " ";
      Y.Assert.isTrue(encoder.isEmpty(val), "blank string check failed.");
      val = "steve!";
      Y.Assert.isFalse(encoder.isEmpty(val), "non-empty string check failed.");
    },
    testHtmlToNumeric: function() {
      Y.Assert.areEqual("&#160;", encoder.HTML2Numerical("&nbsp;"));
    },
    testNumericToHtml: function() {
      Y.Assert.areEqual("&nbsp;", encoder.NumericalToHTML("&#160;"));
    },
    testNumEncode: function() {
      Y.Assert.areEqual("&#920;&#926;114", encoder.numEncode("\u0398\u039e114"));
    },
    testHtmlDecode: function() {
      Y.Assert.areEqual("", encoder.htmlDecode("   "), "empty string check failed.");
      Y.Assert.areEqual("steve", encoder.htmlDecode("steve"), "typical string check failed.");
      Y.Assert.areEqual("&\u00a9\u00ae", encoder.htmlDecode("&amp;&copy;&#174;"), "entity check failed");
    },
    testHtmlEncodeEntity: function() {
      Y.Assert.areEqual("", encoder.htmlEncode("   "), "empty check failed");
      Y.Assert.areEqual("&amp;", encoder.htmlEncode("&"), "ampersand check failed");
      Y.Assert.areEqual("&copy;", encoder.htmlEncode("\u00a9"), "copyright check failed");
    },
    testHtmlEncodeNumeric: function() {
      encoder.encodeType = "numerical";
      Y.Assert.areEqual("&#38;&#60;&#62;", encoder.htmlEncode("&<>"), "html entity check failed");
      Y.Assert.areEqual("&#169;", encoder.htmlEncode("\u00a9"), "copyright check failed");
    },
    testHasEncoded: function() {
      Y.Assert.isTrue(encoder.hasEncoded("steve &#169; rocks"), "numeric check failed");
      Y.Assert.isTrue(encoder.hasEncoded("steve &copy; rocks"), "entity check failed");
      Y.Assert.isFalse(encoder.hasEncoded("steve (no copy) rocks &#nbsp;"), "no entity check failed");
    },
    testStripUnicode: function() {
      Y.Assert.areEqual("steve", encoder.stripUnicode("ste\u00a9ve"));
    },
    testCorrectEncoding: function() {
      Y.Assert.areEqual("&amp;", encoder.correctEncoding("&amp;amp;"));
    }
  });

  Y.TestRunner.add(tc);
})();