exports.getWidget = function(feather, cb) {
  var channel1 = feather.socket.addChannel({id: "channel1"});
  var channel2 = feather.socket.addChannel({
    id: "channel2",
    bouncing: true
  });
  var channel3 = feather.socket.addChannel({
    id: "channel3",
    announceConnections: false,
    messages: ["test", "ack"]
  });
  var channel4 = feather.socket.addChannel({
    id: "channel4",
    bouncing: true,
    messages: ["test", "ack"]
  });
  var channel5 = feather.socket.addChannel({
    id: "channel5",
    allowDirectMessaging: true,
    allowGroups: true,
    messages: ["test", "ack", "ack2"]
  });

  cb(null, {
    name: "api_tester.channelTests",
    path: "widgets/channelTests/"
  });
};