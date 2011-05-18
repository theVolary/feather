feather.ns("api_tester");
api_tester.chat1 = feather.widget.create({
  name: "api_tester.chat1",
  path: "/widgets/chat1/",
  prototype: {
    initialize: function($super, options) {
      $super(options);
    }
  }
});