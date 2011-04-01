var parser = require("./parser"),
  sys = require("sys");

/**
 * listen to the loadwidget event and use the supplied arguments to return a 
 * rendered version of the requested widget back to the client
 */
jojo.socket.on("loadwidget", function(args) {
  var client = args.client, 
    message = args.message, 
    eventArgs = message.data.eventArgs;
  parser.parseWidget({
    path: eventArgs.path,
    options: eventArgs.options
  }, function(result) {
    client.send({
      type: "event",
      eventName: "loadwidget:" + eventArgs.messageId,
      eventArgs: {result: result},
      channelName: message.data.channelName
    });
  });
});
