var _ = require("underscore")._,
  Registry = require("./registry"),
  uuid = require("node-uuid"), //TODO migrate usage to uuid-pool later
  inherits = require("inherits"),
  cache = require("./simple-cache");

/**
 * @namespace Channels
 * @name Channels
 */

/*
 * A registry to store named channels that can be subscribed to
 */
var channels = exports.channels = new Registry();

//TODO: refactor to a better message/event routing mechanism so we don't need so many reserved messages
var reservedMessages = [
  "subscribe", 
  "unsubscribe", 
  "connection", 
  "disconnection", 
  "error"
];
var errorTemplate = [
  "channelId: ${channelId}",
  "sessionId: ${sessionId}",
  "clientId: ${clientId}",
  "errorType: ${errorType}",
  "errorMessage: ${errorMessage}",
  "errorData: {{html errorData}}"
].join('; ');

var reservedStr = reservedMessages.join(", ").replace(/\,\s$/, "");

var logger;

cache.getItemWait("feather-logger", function(err, _logger) {
  _logger && (logger = _logger) && logger.addTemplate("channel-error", errorTemplate);
});

var errorTypes = {
  UNSUPPORTED_MESSAGE: {
    type: "Unsupported Message",
    message: "Disallowed or reserved message type attempt. Reserved messages: " + reservedStr
  },
  DIRECT_MESSAGE_NOT_ALLOWED: {
    type: "Direct Messages Not Allowed",
    message: "Direct Messaging is not enabled on this channel."
  },
  NOT_SUBSCRIBED: {
    type: "Not Subscribed",
    message: "Client is not subscribed to this channel."
  }
};

/**
 * @class Channels allow events to be published to one or more clients who have subscribed.
 * Clients are added to a channel on successful subscription.
 *
 * @extends Registry
 */
var Channel = module.exports.Channel = function(options) {
  Channel.super.call(this, options, {
    announceConnections: true,
    allowDirectMessaging: false,
    bouncing: false,
    hooks: {}
  });

  this.clientUUIDs = {};
  this.crossIndexedClients = {};
  this.clientsBySessionId = {};

  // Add this as a client for server-originated messages.
  this.channelClient = { id: uuid() };
  Channel.super.prototype.add.call(this, this.channelClient);
};

var nohook = {};

Channel.prototype = {
  /**
   * TODO: Fill in description and param types
   * @param {Object} hook
   * @param {Object} hookArgs
   * @param {Function} cb
   */
  doHook: function(hook, hookArgs, cb) {
    var handler = this.options.hooks[hook];
    if (!handler) cb(nohook); else {
      handler.call(this, hookArgs, cb);
    }
  },
  /**
   * TODO: Complete description and param types
   * @param {Object} client
   * @param {Object} messageData
   */
  handleMessage: function(client, messageData, cb) {
    var message = messageData.message,
      data = messageData.data;
      
    //special case 'subscribe' since all other actions require subscription first
    if (message === "subscribe") {
      this.add(client, data, cb);
    } else {
      if (this.itemCache[client.id]) {
        switch (message) {
          case "unsubscribe":
            this.remove(client);
            cb && cb();
            break;
          default:
            this.send(client, message, data, messageData.toClients, cb);
            break;
        }
      } else {
        this.error(
          client,
          errorTypes.NOT_SUBSCRIBED
        );
        cb && cb();
      }
    }    
  },

  /**
   * TODO: Complete description and param types
   * @param {Object} client
   * @param {Object} data
   */
  add: function(client, data, cb) {
    if (client.id === this.channelClient.id) {
      return Channel.super.prototype.add.call(this, client); 
    }

    if (!this.findById(client.id)) {      
      var me = this,
          hookArgs = {
            client: client,
            data: data
          };
      me.doHook("subscribe", hookArgs, function(err, hookData) {
        if (err && err !== nohook) {
          me.error(
            client, 
            {type: "Hook Error", message: "Subscribe error: " + err},
            {hook: "subscribe", error: err}
          );
        } else {
          data = err === nohook ? data : hookData;
          //create a channel specific uuid to avoid exposing underlying socket.io ids to other clients
          var _uuid = client.uuid || uuid(); //TODO: change this to use uuid-pool if implemented
          client.uuid = _uuid;
          var added = Channel.super.prototype.add.call(me, client);
          if (added) {            
            me.clientUUIDs[client.id] = _uuid; 
            me.crossIndexedClients[_uuid] = client; //enable fast lookups by channel-specific uuid
            me.clientsBySessionId[client.session.id] = client;

            if (me.options.announceConnections) {
              me.doHook("connect", hookArgs, function(err, hookData) {
                if (err && err !== nohook) {
                  me.error(
                    client, 
                    {type: "Hook Error", message: "Connect error: " + err},
                    {hook: "connect", error: err}
                  );
                } else {
                  data = err === nohook ? data : hookData;
                  var eventData = {
                    type: "channel",
                    channelId: me.id,
                    message: "connection",
                    data: {
                      clientId: _uuid,
                      data: data
                    }
                  };

                  //loop channel clients and send data
                  me.each(function(_client) {
                    if (_client !== client
                        && me.channelClient.id != _client.id) {
                      _client.json.send(eventData);
                    }
                  });

                  //fire connection message event for any local code that cares
                  me.fire('connection', eventData);
                  cb && cb();
                }
              });
            }

            client.on("disconnect", function() {
              me.remove(client);      
              console.log('client was disconnected -------------------------- clientId: ' + client.id);
            });    

            //lastly, tell the client it has successfully subscribed (and let it know its own channel specific id)
            client.json.send({
              type: "channel",
              channelId: me.id,
              message: "subscribe",
              data: {
                clientId: _uuid,
                data: data
              }
            });
          }
        }
      });
    }
  },
  /**
   * TODO: Complete description and param types
   * @param {Object} client
   */
  remove: function(client) {
    var me = this;
    var removed = Channel.super.prototype.remove.call(this, client);
    if (removed && client.id !== me.channelClient.id) {
      var _uuid = me.clientUUIDs[client.id];
      delete me.clientUUIDs[client.id];
      delete me.crossIndexedClients[_uuid];
      delete me.clientsBySessionId[client.session.id];

      me.doHook("disconnect", {client: client}, function(err, hookData) {
        if (err && err !== nohook) {
          me.error(
            client, 
            {type: "Hook Error", message: "Disconnect error: " + err},
            {hook: "disconnect", error: err}
          );
        } else {
          var eventData = {
            type: "channel",
            channelId: me.id,
            message: "disconnection",
            data: {
              clientId: _uuid,
              data: hookData
            }
          };

          if (me.options.announceConnections) {
            //loop clients and send
            me.each(function(_client) {
              if (_client !== client
                  && _client.id !== me.channelClient.id) {
                _client.json.send(eventData);
              }
            });
          }

          //fire local event
          me.fire('disconnection', eventData);
        }
      });

      //lastly, tell the client it has successfully unsubscribed
      client.json.send({
        type: "channel",
        channelId: me.id,
        message: "unsubscribe"
      });
    }
  },
  /**
   * TODO: Complete description and param types
   * @param {Object} client
   * @param {Object} message
   * @param {Object} data
   * @param {Object} toClients
   */
  send: function(client, message, data, toClients, cb) {
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
        var hookArgs = {
          client: client,
          message: message,
          data: data,
          toClients: toClients
        };
        me.doHook("message", hookArgs, function(err, hookData, hookToClients) {
          if (err && err !== nohook) {
            me.error(
              client, 
              {type: "Hook Error", message: "Message error: " + err},
              {hook: "message", error: err}
            );
          } else {
            data = err === nohook 
              ? data 
              : (typeof hookData !== "undefined" 
                ? hookData
                : data);
            var isDirect = toClients && toClients.length;
            var collection = isDirect ? (hookToClients || toClients) : me.items;
            var _uuid = me.clientUUIDs[client.id];

            var eventData = {
              type: "channel",
              channelId: me.id,
              message: message,
              data: {
                clientId: _uuid,
                data: data,
                isDirect: isDirect
              }
            };

            //loop eligible clients
            _.each(collection, function(_client) {
              _client = me.resolveClient(_client);              
              if (_client //sanity check
                  && _client.id != me.channelClient.id
                  && (me.options.bouncing || _client !== client || collection !== me.items)) { //don't send message back to author unless bouncing is on or is explicitly defined in toClients
                
                _client.json.send(eventData);
              }
            });

            //fire event
            me.fire('message', eventData, (hookToClients || toClients));
            cb && cb();
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

  resolveClient: function(_client) {
    return typeof _client === "string" 
      ? (this.crossIndexedClients[_client] || this.clientsBySessionId[_client]) 
      : _client;
  },

  sendMessage: function(message, data, toClients) {
    this.send(this.channelClient, message, data, toClients);
  },

  sendBySessionId: function(sessionId, message, data) {
    this.sendMessage(message, data, [sessionId]);
  },
  
  /**
   * TODO: Complete description
   */
  error: (function() {
    function e(client, errorType, errorData) {
      var me = this;
      if (client.id !== me.channelClient.id) {
        client.json.send({
          type: "channel",
          channelId: me.id,
          message: "channelError",
          data: {
            type: errorType.type,
            message: errorType.message 
          }
        });
        logger.error({
          templateId: "channel-error",
          replacements: {
            channelId: me.id,
            sessionId: client.session.id,
            clientId: client.id,
            errorType: errorType.type,
            errorMessage: errorType.message,
            errorData: errorData ? JSON.stringify(errorData) : ""
          },
          category: "channel"
        });
      }
    }

    return function(/*client, errorType, errorData*/) {
      if (logger) {
        e.apply(this, arguments);
      } else {
        var me = this,
          args = _.toArray(arguments);
        cache.getItemWait("feather-logger", function(err, _logger) {
          _logger && (logger = _logger) && e.apply(me, args);
        });
      }
    };
  })(),

  /**
   * Disposes of this channel.
   */
  dispose: function() {
    //TODO: notify all connected clients the channel is going down?
    Channel.super.prototype.dispose.apply(this, arguments);
  }
};

inherits(Channel, Registry);

//make channel constructor for addChannel/getChannel be configurable (so it can be overridden by subclasses, etc.)
var ChannelConstructor = Channel;

exports.setChannelConstructor = function(ctor) {
  ChannelConstructor = ctor;
};

/**
 * helper method to add channels
 * @function
 * @param {Object} options options to pass to the channel creation.
 * @memberOf Channels
 */
var addChannel = exports.addChannel = function(options) {
  var channel = new ChannelConstructor(options);
  channels.add(channel);
  return channel;
};

/**
 * helper method to get a channel
 * @function
 * @param {Object} id the id of the channel to search for
 * @memberOf Channels
 */
var getChannel = exports.getChannel = function(id) {
  return channels.findById(id);
};