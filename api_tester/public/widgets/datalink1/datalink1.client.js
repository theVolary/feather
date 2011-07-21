feather.ns("api_tester");
(function() {
  api_tester.datalink1 = feather.widget.create({
    name: "api_tester.datalink1",
    path: "widgets/datalink1/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      }
    }
  });
})();