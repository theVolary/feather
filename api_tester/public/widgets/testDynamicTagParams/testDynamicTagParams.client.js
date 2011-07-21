feather.ns("api_tester");
(function() {
  api_tester.testDynamicTagParams = feather.widget.create({
    name: "api_tester.testDynamicTagParams",
    path: "widgets/testDynamicTagParams/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      }
    }
  });
})();