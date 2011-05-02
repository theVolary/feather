feather.ns("blog");

var chatChannel = feather.socket.addChannel({
  id: "blog:chat",
  announceConnections: true, //tell all connected clients when a new client joins
  messages: ["chat"] //defining a messages array limits what messages are allowed
});

blog.chat = feather.widget.create({
  name: "blog.chat",
  path: "widgets/chat/",
  prototype: {
    initialize: function($super, options) {
      $super(options);
    }
  } // end prototype
});
