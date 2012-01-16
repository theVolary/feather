feather.ns("api_tester");
(function() {
  api_tester.getSSLsessionVar = feather.Widget.create({
    name: "api_tester.getSSLsessionVar",
    path: "widgets/getSSLsessionVar/",
    prototype: {
      onInit: function() {
        
      },
      onReady: function() {
        var me = this;
        this.domEvents.bind(this.get("#getVar"), "click", function() {
          me.server_getSessionVar(function(args) {
            alert(args.result);
          });
        });
      }
    }
  });
})();