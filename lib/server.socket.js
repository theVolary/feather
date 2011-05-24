var io = require("socket.io"), 
  http = require("http"), 
  util = require("util"),
  uuid = require("node-uuid"); //TODO migrate usage to uuid-pool later

/**
 * The main socket namespace object, which will also be used to route 
 * secure system messages to and from clients and the server (automatically keyed by client id).
 */
feather.socket = new feather.event.eventPublisher();

/**
 * A registry to store named channels that can be subscribed to
 */
feather.socket.channels = new feather.lang.registry();

var reservedMessages = [
  "subscribe", 
  "unsubscribe", 
  "connection", 
  "disconnection", 
  "error",
  "groupJoined"
];
var errorTemplate = [
  "channel: ${channelId}",
  "clientId: ${clientId}",
  "sessionId: ${sessionId}",
  "errorType: ${errorType}",
  "errorMessage: ${errorMessage}",
  "errorData: {{html errorData}}"
].join('; ');

var reservedStr = reservedMessages.join(", ").replace(/\,\s^/, "");

feather.logger.addTemplate("channel-error", errorTemplate);

var errorTypes = {
  UNSUPPORTED_MESSAGE: {
    type: "Unsupported Message",
    message: "Disallowed or reserved message type attempt. Reserved messages: " + reservedStr
  },
  DIRECT_MESSAGE_NOT_ALLOWED: {
    type: "Direct Messages Not Allowed",
    message: "Direct Messaging is not enabled on this channel."
  }
};

/**
 * Channels allow events to be published to one or more clients who have subscribed.
 * Clients are added to a channel on successful subscription.
 */
feather.socket.channel = Class.create(feather.lang.registry, /** @lends feather.socket.channel */ {
  initialize: function($super, options) {
    options = _.extend({
      announceConnections: true,
      allowDirectMessaging: false,
      allowGroups: false,
      bouncing: false,
      inviteTimeout: 10000 //10 seconds
    }, options || {});
    options.idKey = "sessionId";
    $super(options);
    this.clientIds = {};
    this.crossIndexedClients = {};
  },
  handleMessage: function(client, messageData) {
    var message = messageData.message,
      data = messageData.data;
    switch (message) {
      case "subscribe":
        this.add(client, data);
        break;
      case "unsubscribe":
        this.remove(client);
        break;
      default:
        this.send(client, message, data, messageData.toClients);
        break;
    }
  },
  add: function($super, client, data) {
    var added = $super(client, true);
    if (added) {
      var me = this;
      var _uuid = uuid();
      me.clientIds[client.sessionId] = _uuid; //TODO: change this to use uuid-pool if implemented
      me.crossIndexedClients[_uuid] = client; //enable fast lookups by channel-specific uuid
      if (me.options.announceConnections) {
        me.each(function(_client) {
          if (_client !== client) {
            _client.send({
              type: "channel",
              channelId: me.id,
              message: "connection",
              data: {
                clientId: _uuid,
                data: data
              }
            });
          }
        });
      }
      client.on("disconnect", function() {
        me.remove(client);      
      });    
      //lastly, tell the client it has successfully subscribed (and let it know its own channel specific id)
      client.send({
        type: "channel",
        channelId: me.id,
        message: "subscribe",
        data: {
          clientId: _uuid
        }
      });
    }
  },
  remove: function($super, client) {
    var me = this;
    $super(client);
    var _uuid = me.clientIds[client.sessionId];
    delete me.clientIds[client.sessionId];
    delete me.crossIndexedClients[_uuid];
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
  },
  send: function(client, message, data, toClients) {
    var me = this;
    //swallow reserved messages (only the server can initiate those)
    if (reservedMessages.indexOf(message.toLowerCase()) > -1) {
      me.error(
        client, 
        errorTypes.UNSUPPORTED_MESSAGE, 
        {message: message, data: data}
      );
    } else if (toClients && toClients.length && !me.options.allowDirectMessaging) {
      me.error(
        client, 
        errorTypes.DIRECT_MESSAGE_NOT_ALLOWED,
        {message: message, data: data, toClients: toClients}
      );
    } else {    
      //apply message restrictions if they exist
      if (!me.options.messages || me.options.messages.indexOf(message) > -1) {
        var collection = (toClients && toClients.length) ? toClients : me;
        collection.each(function(_client) {
          _client = typeof _client === "string" ? me.crossIndexedClients[_client] : _client;
          if (_client //sanity check
              && (me.options.bouncing || _client !== client)) { //don't send message back to author unless bouncing is on
            _client.send({
              type: "channel",
              channelId: me.id,
              message: message,
              data: data
            });
          }
        });
      } else {
        me.error(
          client, 
          errorTypes.UNSUPPORTED_MESSAGE,
          {message: message, data: data}
        );
      }
    }
  },
  error: function(client, errorType, errorData) {
    if (!client || !errorType) return;
    var me = this;
    client.send({
      type: "channel",
      channelId: this.id,
      message: "error",
      data: {
        type: errorType.type,
        message: errorType.message 
      }
    });
    feather.logger.warn({
      templateId: "channel-error",
      replacements: {
        channel: me.id,
        sessionId: client.session.id,
        clientId: client.sessionId,
        errorType: errorType.type,
        errorMessage: errorType.message,
        errorData: errorData ? JSON.stringify(errorData) : ""
      },
      category: "channel"
    });
  }
});

/**
 * shortcut helper method to add channels
 * @param {Object} options
 */
feather.socket.addChannel = function(options) {
  feather.socket.channels.add(new feather.socket.channel(options));
};

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
    channel.handleMessage(client, message.data);
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
