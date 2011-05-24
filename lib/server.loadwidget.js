var feather = require("./feather").feather;
/*
 * listen to the loadwidget event and use the supplied arguments to return a 
 * rendered version of the requested widget back to the client
 */
feather.socket.on("loadwidget", function(args) {
  var client = args.client, 
    message = args.message, 
    eventArgs = message.data.eventArgs,
    clientResult = args.result;
    clientResult.eventName = "loadwidget:" + eventArgs.messageId;
    
  feather.parser.parseWidget({
    id: eventArgs.widgetId,
    path: eventArgs.path,
    options: eventArgs.options
  }, function(result) {
    clientResult.eventArgs = { result: result };
    client.send(clientResult);
  });
});
