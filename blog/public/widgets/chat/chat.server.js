exports.getWidget = function(feather, cb) {
  var chatChannel = feather.socket.addChannel({
    id: "blog:chat",
    announceConnections: true, //tell all connected clients when a new client joins
    messages: ["chat"] //defining a messages array limits what messages are allowed
  });

  cb(null, {
    name: "blog.chat",
    path: "widgets/chat/"
  });
}