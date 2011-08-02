feather.ns("api_tester");
(function() {
  api_tester.channelClient2 = feather.Widget.create({
    name: "api_tester.channelClient2",
    path: "widgets/channelClient2/",
    prototype: {
      onReady: function() {
        var me = this;

        var channel5 = feather.socket.subscribe({
          id: "channel5",
          data: {clientMessage: "client2"}
        });
        channel5.once("subscribe", function(subscribeArgs) {
          channel5.joinGroup("publicGroup1");
          channel5.on("group:publicGroup1:test", function(args) {
            channel5.send("group:publicGroup1:ack", {message: "got it"});
          });
        });
        channel5.on("test", function(args) {
          channel5.send("ack2", {message: "got it"});
        });

        window.onbeforeunload = function() {
          channel5.dispose();
        };
      }
    }
  });
})();