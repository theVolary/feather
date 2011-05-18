feather.ns("api_tester");
(function() {
  api_tester.chat1 = feather.widget.create({
    name: "api_tester.chat1",
    path: "/widgets/chat1/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      }
    }
  });
})();