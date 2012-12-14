var parser = require("./parser"),
  socket = require("./socket");

/*
 * listen to the loadwidget event and use the supplied arguments to return a 
 * rendered version of the requested widget back to the client
 */
socket.on("loadwidget", function(args) {
  var client = args.client, 
    message = args.message, 
    eventArgs = message.data.eventArgs,
    clientResult = args.result;
    clientResult.eventName = "loadwidget:" + eventArgs.messageId;
    
  parser.parseWidget({
    id: eventArgs.widgetId,
    path: eventArgs.path,
    options: eventArgs.options,
    request: { session: client.session }, //socket.io context requires a dummy request object
  }, function(err, result) {
    clientResult.eventArgs = { result: result };
    client.json.send(clientResult);
  });
});