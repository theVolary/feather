feather.ns("api_tester");
(function() {
  api_tester.clientSideRender = feather.Widget.create({
    name: "api_tester.clientSideRender",
    path: "widgets/clientSideRender/",
    runat: "client",
    template: [
      '<input type="button" id="testBtn" value="click me" />'
    ].join(''),
    prototype: {
      onInit: function() {
        
      }
      onReady: function() {
        this.bindUI();
      },
      bindUI: function() {
        var me = this;

        me.domEvents.bind(me.get("#testBtn"), "click", function() {
          alert("clicked");
        });
      }
    }
  });
})();