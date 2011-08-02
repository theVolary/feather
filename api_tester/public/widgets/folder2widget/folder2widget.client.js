feather.ns("api_tester");
(function() {
  api_tester.folder2widget = feather.Widget.create({
    name: "api_tester.folder2widget",
    path: "widgets/folder2widget/",
    prototype: {
      onReady: function() {
        this.container.html("<b>PASSED</b>");
      }
    }
  });
})();