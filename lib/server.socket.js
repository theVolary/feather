var io = require("socket.io"), http = require("http"), sys = require("sys");

/**
 * Create the main socket namespace object, which will also be used to route 
 * system messages (keyed by client id).
 */
feather.socket = new feather.event.eventPublisher();

//after feather.socket has been created, load in the system event handlers
require("./server.loadwidget");

function doRpc(client, message) {
  var result = {
    messageId: message.id,
    type: "rpc",
    err: null,
    success: true
  };
  var send = function() {
    client.send(result);
  };
  try {
    if (!message || !message.id || !message.data) {
      throw new Error("All feather.socket messages require an id and data property.");
    }
    var shortWidgetName = message.data.widgetPath.match(/[^\/]*\/$/)[0].replace("/", "");
    var widgetClass = feather.widget.loadClass(message.data.widgetPath, shortWidgetName);
    var instance = new (widgetClass.classDef)({request: message.request});
    debugger;
    message.data.params.push(function(err, ret) {
      if (err) {
        result.success = false;
        result.err = err;
      } else {
        if (typeof(ret) !== "undefined") {
          result.result = ret;
        }
      }
      instance.dispose();
      send();
    });
    instance[message.data.methodName].apply(instance, message.data.params);
  } catch (ex) {
    feather.logger.error({message: ex.reason, exception: ex});
    result.err = ex;
    result.success = false;
    send();
  }
}

function doEvent(client, message) {
  //secure the global sysChannel to this client
  if (message.data.channelName === "channel:feather.sys:" + client.sessionId) {
    //this is a system message, route to appropriate handler...
    feather.socket.fire(message.data.eventName, {
      client: client,
      message: message,
      result: {
        type: "event",
        eventName: message.data.eventName,
        eventArgs: null,
        channelName: message.data.channelName
      }
    });
  } else {
    //for now, just broadcast... routing is done on client via channelName
    //TODO: add server-side routing via a general feather.socket.securePublisher concept
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
  feather.logger.info({
    message: "Listening on port " + options.socketPort,
    category: "feather.ssock"
  });
  
  //create the socket.io wrapper
  feather.socket.server = io.listen(server);
  feather.socket.server.on('connection', function(client) {
    client.on("disconnect", function() {
      //debugger;
    });
    client.on("message", function(message) {
      if (message.sid && feather.server.sessionStore) {
        feather.server.sessionStore.get(message.sid, function(err, sess) {
          if (!err) {
            if (sess.user) {
              sess.user = new feather.auth.userClass(sess.user);
            }
            feather.logger.trace({message:"Got session from store.  it is: " + sys.inspect(sess), category:"feather.ssock"});
            message.request = {session: sess};
          } else {
            feather.logger.error('Error retrieving session: ' + err);
          }
          handleMessage(client, message);
          
          if (message.request && message.request.session) {
            // Re-store the session in case they modified it.
            feather.server.sessionStore.set(message.sid, message.request.session);
          }
        });
      } else {
        handleMessage(client, message);
      }
    });
  });
};
