feather.ns("api_tester");
(function() {
  api_tester.channelClient = feather.Widget.create({
    name: "api_tester.channelClient",
    path: "widgets/channelClient/",
    prototype: {
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

        var channel6 = feather.socket.subscribe({
          id: "channel6",
          data: {
            allowSubscribe: true,
            allowConnect: true,
            clientMessage: "client1"
          }
        });
        channel6.on("connection", function(args) {
          channel6.send("gotConnection", {message: "got it"});
        });
        channel6.on("allowMessage", function(args) {
          if (args.data === "allow this: augmented") {
            channel6.send("ack:allowMessage", {message: "got it"});
          }
        });
        channel6.on("disallowMessage", function(args) {
          channel6.send("ack:disallowMessage", {message: "got it"});
        });
        channel6.on("directMessage", function(args) {
          if (args.isDirect) {
            channel6.send("ack:directMessage", {message: "got it"});
          }
        });


        window.onbeforeunload = function() {
          channel2.dispose();
          channel4.dispose();
          channel5.dispose();
          channel6.dispose();
        };
      }
    }
  });
})();