var io = require("socket.io"), 
    http = require("http"), 
    util = require("util"),
    inherits = require("inherits"),
    eventPublisher = require("./event-publisher"),
    registry = require("./registry");

/**
 * Channels allow events to be published to one or more clients who have subscribed.
 * Clients are added to a channel on successful subscription.
 */
var reservedMessages = ["subscribe", "unsubscribe", "connection", "disconnection", "error"];
var reservedStr = reservedMessages.join(", ");
var reservedErr = "Reserved message type attempt. Reserved messages: " + reservedStr;

var socket = exports.socket = new eventPublisher();
/**
 * A registry to store named channels that can be subscribed to
 */
socket.channels = new registry();

var Channel = exports.Channel = function(options) {
  options = _.extend({
    announceConnections: true,
    allowDirectMessaging: false,
    allowGroups: false,
    bouncing: false
  }, options || {});
  options.idKey = "sessionId";
  socket.channel.super.apply(this, options);
};
inherits(Channel, registry);

Channel.prototype.add = function(client, message) {
  var added = Channel.super.prototype.add.call(this, client, true);
  if (added) {
    var me = this;
    if (me.options.announceConnections) {
      me.each(function(_client) {
        if (_client !== client) {
          _client.send({
            type: "channel",
            channelId: me.id,
            message: "connection"
          });
        }
      });
    }
    client.on("disconnect", function() {
      me.remove(client);      
    });    
    //lastly, tell the client it has successfully subscribed
    client.send({
      type: "channel",
      channelId: me.id,
      message: "subscribe"
    });
  }
};

Channel.prototype.remove = function(client) {
  var me = this;
  Channel.super.prototype.remove.call(this, client);
  if (me.options.announceConnections) {
    me.each(function(_client) {
      if (_client !== client) {
        _client.send({
          type: "channel",
          channelId: me.id,
          message: "disconnection"
        });
      }
    });
  }
  //lastly, tell the client it has successfully unsubscribed
  client.send({
    type: "channel",
    channelId: me.id,
    message: "unsubscribe"
  });
};

Channel.prototype.send = function(client, message, data) {
  var me = this;
  //swallow reserved messages (only the server can initiate those)
  if (reservedMessages.indexOf(message.toLowerCase()) > -1) {
    me.error(client, reservedErr);
  }
  
  //apply message restrictions if they exist
  if (!me.options.messages || me.options.messages.indexOf(message) > -1) {
    me.each(function(_client) {
      if (me.options.bouncing || _client !== client) { //don't send message back to author unless bouncing is on
        _client.send({
          type: "channel",
          channelId: me.id,
          message: message,
          data: data
        });
      }
    });
    //tell client send was a success?
  } else {
    logger.warn("An attempt was made to send an unsupported message '" + message + "' to channel '" + this.id + "'.");
    //tell client send failed?
  }
};

Channel.prototype.error = function(client, err, logMessage) {
  logMessage = logMessage || err;
  client.send({
    type: "channel",
    channelId: this.id,
    message: "error",
    data: err
  });
  logger.warn({
    message: logMessage,
    category: "channel"
  });
};

/**
 * shortcut helper method to add channels
 * @param {Object} options
 */
socket.addChannel = function(options) {
  socket.channels.add(new Channel(options));
};

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
      throw new Error("All feather socket messages require an id and data property.");
    }
    var shortWidgetName = message.data.widgetPath.match(/[^\/]*\/$/)[0].replace("/", "");
    var widgetClass = feather.widget.loadClass({publicRoot:feather.appOptions.publicRoot}, message.data.widgetPath, shortWidgetName);
    var instance = new (widgetClass.classDef)({
      request: message.request,
      client: client
    });
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
  //secure the global busChannel to this client 
  //(in other words, this conversation is just between the server and this client)
  if (message.data.busName === "bus:feather.sys:" + client.sessionId) {
    //this is a system message, route to appropriate handler...
    feather.socket.fire(message.data.eventName, {
      client: client,
      message: message,
      result: {
        type: "event",
        eventName: message.data.eventName,
        eventArgs: null,
        busName: message.data.busName
      }
    });
  } else {
    //for now, just broadcast... routing is done on client via channelName
    //TODO: add server-side routing via a general feather.socket.securePublisher concept
    client.broadcast({
      type: "event",
      eventName: message.data.eventName,
      eventArgs: message.data.eventArgs,
      busName: message.data.busName,
      messageId: message.id
    });
  }
}

function doChannel(client, message) {
  var channel = feather.socket.channels.findById(message.data.channelId);
  if (channel) {
    if (message.data.message === "subscribe") {
      channel.add(client, message);      
    } else if (message.data.message === "unsubscribe") {
      channel.remove(client);
    } else {
      channel.send(client, message.data.message, message.data.data);
    }
  } else {
    //send back an error message?
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
    case "channel":
      doChannel(client, message);
      break;
    case "sessionId":
      client.send({
        messageId: message.id,
        sessionId: client.sessionId
      });
      break;
  }
}

exports.init = function(options) {

  var feather = options.feather;

  //after feather.socket has been created, load in the system event handlers
  require("./server.loadwidget").init({socket:socket, parser:feather.parser});

  /**
   * The main socket namespace object, which will also be used to route 
   * secure system messages to and from clients and the server (automatically keyed by client id).
   */
  feather.socket = socket;
  
  //create a shim http server instance
  var server = http.createServer(function(req, res) {
    //TODO: anything needed here?
  });
  
  //start listening
  server.listen(options.socketPort);
  feather.logger.info({
    message: "feather socket server listening on port " + options.socketPort,
    category: "feather.ssock"
  });
  
  //create the socket.io wrapper
  feather.socket.server = io.listen(server);
  feather.socket.server.server.on('close', function(errno) {
    feather.logger.info({message:"feather socket server shutting down.", category:'feather.srvr', immediately:true});
  });
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
            feather.logger.trace({message:"Got session from store.  it is: " + util.inspect(sess), category:"feather.ssock"});
            message.request = {session: sess};
            client.session = sess;
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
