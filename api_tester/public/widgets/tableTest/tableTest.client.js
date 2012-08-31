feather.ns("api_tester");
(function() {
  api_tester.tableTest = feather.Widget.create({
    name: "api_tester.tableTest",
    path: "widgets/tableTest/",
    prototype: {
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Widgets nested inside of tables");

        suite.add(new Y.Test.Case({
          name: "Widgets in tables",
          setUp: feather.emptyFn,
          tearDown : feather.emptyFn,

          testWidgetInTable: function () {
            var test = this;
            
            feather.Widget.load({
              path: "widgets/tables/",
              clientOptions: {
                containerOptions: {
                  title: "testing widgets in tables"
                },
                onceState: {
                  ready: function() {
                    var widget = this;
                    test.resume(function() {
                      var content = null;
                      try {
                        content = widget.embeddedWidget.get('.widgetContent').html();
                      } catch (ex) {

                      }
                      widget.dispose();
                      Y.Assert.areEqual(content, 'foo');
                    });
                  }
                }
              }
            });

            test.wait(2000);
          }
        }));

        Y.Test.Runner.add(suite);
      }
    }
  });
})();