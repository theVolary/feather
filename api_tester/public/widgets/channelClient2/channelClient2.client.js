feather.ns("api_tester");
(function() {
  api_tester.channelClient2 = feather.widget.create({
    name: "api_tester.channelClient2",
    path: "widgets/channelClient2/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      },
      onReady: function() {
        var me = this;

        var channel5 = feather.socket.subscribe({
          id: "channel5",
          data: {clientMessage: "client2"}
        });
        channel5.on("test", function(args) {
          channel5.send("ack2", {message: "got it"});
        });

        window.onbeforeunload = function() {
          channel5.unsubscribe();
        };
      }
    }
  });
})();