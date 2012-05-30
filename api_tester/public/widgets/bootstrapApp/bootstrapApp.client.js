feather.ns("api_tester");
(function() {
  api_tester.bootstrapApp = feather.Widget.create({
    name: "api_tester.bootstrapApp",
    path: "widgets/bootstrapApp/",
    prototype: {
      onInit: function() {
        
      },
      onReady: function() {
        var me = this;

        //test alert
        feather.alert("An alert", "This is an alert test", function() {

          //test loading a widget
          var w;
          feather.Widget.load({
            path: 'widgets/datalink1/',
            clientOptions: {
              containerOptions: {
                title: 'A widget loaded from the server',
                width: 800,
                height: 600,
                buttons: {
                  dispose: function() {
                    w.dispose();
                  }
                }
              },

              onceState: {
                ready: function() {
                  w = this;
                }
              },

              once: {
                disposed: function() {
                  feather.alert("Widget disposed", "the widget was disposed");
                }
              }
            }
          });
        });
      }
    }
  });
})();