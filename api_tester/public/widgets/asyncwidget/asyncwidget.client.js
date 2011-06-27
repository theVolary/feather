feather.ns("api_tester");
(function() {

  api_tester.asyncwidget = feather.widget.create({
    name: "api_tester.asyncwidget",
    path: "widgets/asyncwidget/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
        this.foo = "bar";
      }
    }
  });
})();