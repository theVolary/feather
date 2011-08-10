feather.ns("api_tester");
(function() {
  api_tester.inheritableClientWidget = feather.Widget.create({
    name: "api_tester.inheritableClientWidget",
    path: "widgets/inheritableClientWidget/",
    clientOnly: true,
    template: [
      '<input type="button" id="btn" value="click me"/>',
      'content goes here:',
      '<div id="content">',
        '<content/>',
      '</div>'
    ].join(""),
    prototype: {
      onInit: function() {
        var containerizer = feather.Widget.containerizers["default"];
        if (containerizer && typeof containerizer.containerize === "function") {
          containerizer.containerize(this);
        }
      },
      onReady: function() {
        this.domEvents.bind(this.get("#btn"), "click", function() {
          alert("click 1");
        });
      }
    }
  });
})();