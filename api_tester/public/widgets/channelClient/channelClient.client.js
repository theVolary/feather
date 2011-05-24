feather.ns("api_tester");
(function() {
  api_tester.channelClient = feather.widget.create({
    name: "api_tester.channelClient",
    path: "widgets/channelClient/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      },
      onReady: function() {
        var me = this;

        var channel2 = feather.socket.subscribe({id: "channel2"});
        channel2.on("test", function(args) {
          channel2.send("ack", {message: "got it"});
        });

        var channel4 = feather.socket.subscribe({id: "channel4"});
        channel4.on("test", function(args) {
          channel4.send("ack", {message: "got it"});
        });

        var channel5 = feather.socket.subscribe({
          id: "channel5",
          data: {clientMessage: "client1"}
        });
        channel5.on("test", function(args) {
          channel5.send("ack", {message: "got it"});
        });

        window.onbeforeunload = function() {
          channel2.unsubscribe();
          channel4.unsubscribe();
          channel5.unsubscribe();
        };
      }
    }
  });
})();