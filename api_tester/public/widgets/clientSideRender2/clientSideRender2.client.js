feather.ns("api_tester");
(function() {
  api_tester.clientSideRender2 = feather.Widget.create({
    name: "api_tester.clientSideRender2",
    path: "widgets/clientSideRender2/",
    clientOnly: true,
    template: [
      'this is clientSideRender2 widget\'s template <br/>',
      '<content/>',
      '<input type="button" id="testBtn" value="click me" />',
      '<div>title = ${options.title}</div>',
      '<widget id="testWidget" path="widgets/clientSideRender3/">',
        '<options>',
          '<option name="title" value="server side widget" />',
        '</options>',
        '<contentTemplate>',
          'this is content from a &lt;contentTemplate&gt; tag (for a server side widget)',
          '<widget id="testWidgetServer" path="widgets/clientSideRender3/">',
            '<options>',
              '<option name="title" value="server side widget #2 baby" />',
            '</options>',
          '</widget>',
          '<widget id="testWidgetClient" path="widgets/clientSideRender4/">',
            '<options>',
              '<option name="title" value="client side widget (in a template sent to the server)" />',
            '</options>',
          '</widget>',
        '</contentTemplate>',
      '</widget>'
    ].join(''),
    prototype: {
      onInit: function() {
        
      },
      onReady: function() {
        this.bindUI();
      },
      bindUI: function() {
        var me = this;

        me.domEvents.bind(me.get("#testBtn"), "click", function() {
          alert("clientSideRender2 clicked");
        });
      }
    }
  });
})();