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
        var channel = feather.socket.subscribe({id: "channel2"});
        channel.on("test", function(args) {
          channel.send("ack", {message: "got it"});
        });
      }
    }
  });
})();