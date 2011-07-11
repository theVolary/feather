feather.ns("api_tester");
(function() {
  api_tester.folder2widget = feather.widget.create({
    name: "api_tester.folder2widget",
    path: "widgets/folder2widget/",
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