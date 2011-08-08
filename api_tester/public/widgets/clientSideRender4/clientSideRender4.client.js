feather.ns("api_tester");
(function() {
  api_tester.clientSideRender4 = feather.Widget.create({
    name: "api_tester.clientSideRender4",
    path: "widgets/clientSideRender4/",
    clientOnly: true,
    template: [
      '<input type="button" id="testBtn" value="click me" />',
      '<div>title = ${options.title}</div>'
    ].join(""),
    prototype: {
      onInit: function() {
        
      },
      onReady: function() {
        this.bindUI();
      },
      bindUI: function() {
        var me = this;
        
        me.domEvents.bind(me.get("#testBtn"), "click", function() {
          alert("clientSideRender4 clicked");
        });
      }
    }
  });
})();