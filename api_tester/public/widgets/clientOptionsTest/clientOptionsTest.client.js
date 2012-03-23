feather.ns("api_tester");
(function() {
  api_tester.clientOptionsTest = feather.Widget.create({
    name: "api_tester.clientOptionsTest",
    path: "widgets/clientOptionsTest/",
    prototype: {
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Client enable options");

        suite.add(new Y.Test.Case({
          name: "Client option 'bar' has value 'foo', from a server template",

          setUp: feather.emptyFn,

          tearDown : function(){

          },

          testClientOptions: function () {
            //simple test... this widget embedded another widget from the server...
            Y.Assert.areEqual('foo', me.embeddedWidget.options.bar);
          }
        }));

        Y.Test.Runner.add(suite);
      }
    }
  });
})();