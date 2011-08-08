feather.ns("api_tester");
(function() {
  api_tester.clientSideRender = feather.Widget.create({
    name: "api_tester.clientSideRender",
    path: "widgets/clientSideRender/",
    clientOnly: true,
    template: [
      '<input type="button" id="testBtn" value="click me" />',
      '<div>title = ${options.title}</div>',
      '<widget id="testWidget" path="widgets/clientSideRender2/">',
        '<options>',
          '<option name="title" value="foobar" />',
        '</options>',
        '<contentTemplate>',
          'this is content from a &lt;contentTemplate&gt; tag',
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
          alert("clientSideRender clicked");
        });
      }
    }
  });
})();