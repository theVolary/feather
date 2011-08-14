feather.ns("api_tester");
(function() {
  api_tester.inheritableClientWidgetTest = feather.Widget.create({
    inherits: api_tester.inheritableClientWidget,
    name: "api_tester.inheritableClientWidgetTest",
    path: "widgets/inheritableClientWidgetTest/",
    clientOnly: true,
    prototype: {
      contentTemplate: $("<contentTemplate>foo</contentTemplate>"),
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Inheritable Client Widget");

        suite.add(new Y.Test.Case({
          name: "Inheritable Client Widget",
          setUp: feather.emptyFn,
          tearDown : function(){
            
          },

          testInheritableClientWidget: function () {
            var test = this;
            var containsFoo = me.get("#content").html().indexOf("foo") > -1;
            Y.Assert.areEqual(true, containsFoo);
          }
        }));

        Y.Test.Runner.add(suite);
      },
      onReady: function() {
        super.prototype.onReady && super.prototype.onReady.apply(this, arguments);
        this.domEvents.bind(this.get("#btn"), "click", function() {
          alert("click 2");
        });
      }
    }
  });
  
  var super = api_tester.inheritableClientWidgetTest.super;
})();