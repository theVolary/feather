var io = require("socket.io"), http = require("http"), sys = require("sys");

/**
 * Create the main socket namespace object, which will also be used to route 
 * system messages (keyed by client id).
 */
jojo.socket = new jojo.event.eventPublisher();

//after jojo.socket has been created, load in the system event handlers
require("./server.loadwidget");

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
  //secure the global sysChannel to this client
  if (message.data.channelName === "channel:jojo.sys:" + client.sessionId) {
    //this is a system message, route to appropriate handler...
    jojo.logger.trace("jojo.sys event: " + sys.inspect(message));
    jojo.socket.fire(message.data.eventName, {
      client: client,
      message: message
    });
  } else {
    //for now, just broadcast... routing is done on client via channelName
    //TODO: add server-side routing via a general jojo.socket.securePublisher concept
    client.broadcast({
      type: "event",
      eventName: message.data.eventName,
      eventArgs: message.data.eventArgs,
      channelName: message.data.channelName
    });
  }
}

function handleMessage(client, message) {
  switch (message.type) {
    case "rpc":
      doRpc(client, message);
      break;
    case "event":
      doEvent(client, message);
      break;
    case "sessionId":
      client.send({
        type: "rpc", //re-using rpc mechanisms for callback on client
        messageId: message.id,
        sessionId: client.sessionId
      });
      break;
  }
}

exports.init = function(options) {
  //create a shim http server instance
  var server = http.createServer(function(req, res) {
    //TODO: anything needed here?
  });
  
  //start listening
  server.listen(options.socketPort);
  jojo.logger.info({
    message: "Listening on port " + options.socketPort,
    category: "jojo.ssock"
  });
  
  //create the socket.io wrapper
  jojo.socket.server = io.listen(server);
  jojo.socket.server.on('connection', function(client) {
    client.on("disconnect", function() {
      //debugger;
    });
    client.on("message", function(message) {
      if (message.sid && jojo.server.sessionStore) {
        jojo.server.sessionStore.get(message.sid, function(err, sess) {
          if (!err) {
            jojo.logger.trace("Got session from store.  it is: " + sys.inspect(sess));
            client.session = sess;
          } else {
            jojo.logger.error('Error retrieving session: ' + err);
          }
          handleMessage(client, message);
          if (client.session) {
            // Re-store the session in case they modified it.
            jojo.server.sessionStore.set(message.sid, client.session);
          }
        });
      } else {
        handleMessage(client, message);
      }
    });
  });
};
