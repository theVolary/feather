feather.ns("api_tester");
(function() {
  api_tester.testAppOnReady = feather.widget.create({
    name: "api_tester.testAppOnReady",
    path: "widgets/testAppOnReady/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      }
    }
  });
})();