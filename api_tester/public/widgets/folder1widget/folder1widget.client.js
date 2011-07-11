feather.ns("api_tester");
(function() {
  api_tester.folder1widget = feather.widget.create({
    name: "api_tester.folder1widget",
    path: "widgets/folder1widget/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      },
      onReady: function() {
        this.container.html("<b>PASSED</b>");
      }
    }
  });
})();