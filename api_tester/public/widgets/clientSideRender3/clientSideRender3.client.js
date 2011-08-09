feather.ns("api_tester");
(function() {
  api_tester.clientSideRender3 = feather.Widget.create({
    name: "api_tester.clientSideRender3",
    path: "widgets/clientSideRender3/",
    prototype: {
      onInit: function() {
        
      },
      onReady: function() {
        this.bindUI();
      },
      bindUI: function() {
        var me = this;
        
        me.domEvents.bind(me.get("#testBtn"), "click", function() {
          alert("clientSideRender3 clicked");
        });
      }
    }
  });
})();