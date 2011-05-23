feather.ns("api_tester");

var channel1 = feather.socket.addChannel({id: "channel1"});
var channel2 = feather.socket.addChannel({
  id: "channel2",
  bouncing: true
});
var channel3 = feather.socket.addChannel({
  id: "channel3",
  announceConnections: false,
  bouncing: true,
  messages: ["test"]
})

api_tester.channelTests = feather.widget.create({
  name: "api_tester.channelTests",
  path: "widgets/channelTests/",
  prototype: {
    initialize: function($super, options) {
      $super(options);
    }
  }
});