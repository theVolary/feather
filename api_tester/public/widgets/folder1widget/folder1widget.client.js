feather.ns("api_tester");
(function() {
  api_tester.folder1widget = feather.Widget.create({
    name: "api_tester.folder1widget",
    path: "widgets/folder1widget/",
    prototype: {
      onReady: function() {
        this.container.html("<b>PASSED</b>");
      }
    }
  });
})();