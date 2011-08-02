feather.ns("api_tester");
(function() {

  api_tester.asyncwidget = feather.Widget.create({
    name: "api_tester.asyncwidget",
    path: "widgets/asyncwidget/",
    prototype: {
      onInit: function() {
        this.foo = "bar";
      }
    }
  });
})();