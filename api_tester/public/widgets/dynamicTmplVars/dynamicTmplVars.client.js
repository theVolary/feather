feather.ns("api_tester");
(function() {
  api_tester.dynamicTmplVars = feather.widget.create({
    name: "api_tester.dynamicTmplVars",
    path: "widgets/dynamicTmplVars/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      }
    }
  });
})();