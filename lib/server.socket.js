var io = require("socket.io"),
  http = require("http"),
  sys = require("sys");
  
//TOOD: make a socket-aware subclass of eventPublisher/fsm to enable 
//auto broadcast of events/state changes as well as allow outside subscribers to trigger the same
jojo.socket = new jojo.event.eventPublisher();

function doRpc(client, message) {
  var result = {
    messageId: message.id,
    type: "rpc",
    err: null,
    success: true
  };
  var clientParams = {
    client: client, 
    result: result, 
    message: message,
    autoResponse: true
  };
  try {
    if (!message || !message.id || !message.data) {
      throw new Error("All jojo.socket messages require an id and data property.");
    }
    var shortWidgetName = message.data.widgetPath.match(/[^\/]*\/$/)[0].replace("/", "");
    var widgetClass = jojo.widget.loadClass(message.data.widgetPath, shortWidgetName);
    var instance = new (widgetClass.classDef)();
    
    message.data.params.unshift(clientParams);
    var ret = instance[message.data.methodName].apply(instance, message.data.params);
    instance.dispose();
    if (typeof(ret) !== "undefined") {
      result.result = ret;
    }
  } catch (ex) {
    result.err = ex;
    result.success = false;
  }
  if (clientParams.autoResponse) {
    client.send(result);
  }
}

function doEvent(client, message) {
  //for now, just broadcast... routing is done on client via channelName
  //TODO: add server-side routing via a jojo.socket.securePublisher concept
  client.broadcast({
    type: "event",
    eventName: message.data.eventName,
    eventArgs: message.data.eventArgs,
    channelName: message.data.channelName
  });
}

exports.init = function(options){
  //create a shim http server instance
  var server = http.createServer(function(req, res){
    //TODO: anything needed here?
  });
  
  //start listening
  server.listen(options.socketPort);
  jojo.logger.info({message:"Listening on port " + options.socketPort, category:"jojo.ssock"});
  
  //create the socket.io wrapper
  jojo.socket.server = io.listen(server);
  jojo.socket.server.on('connection', function(client){ 
    client.on("disconnect", function() {
      //debugger;
    });
    client.on("message", function(message) {
      if (message.type === "rpc") {
        doRpc(client, message);
      } else if (message.type === "event") {
        doEvent(client, message);
      }
    });
  });
};