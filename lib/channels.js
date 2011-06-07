var _ = require("underscore")._,
  simpleCache = require("./simple-cache"),
  EventPublisher = require("./event-publisher"),
  Registry = require("./registry"),
  uuid = require("node-uuid"), //TODO migrate usage to uuid-pool later
  inherits = require("inherits");



/**
 * A registry to store named channels that can be subscribed to
 */
feather.socket.channels = new feather.lang.registry();

//TODO: refactor to a better message/event routing mechanism so we don't need so many reserved messages
var reservedMessages = [
  "subscribe", 
  "unsubscribe", 
  "connection", 
  "disconnection", 
  "error",
  "group:"
];
var errorTemplate = [
  "channel: ${channelId}",
  "clientId: ${clientId}",
  "sessionId: ${sessionId}",
  "errorType: ${errorType}",
  "errorMessage: ${errorMessage}",
  "errorData: {{html errorData}}"
].join('; ');

var reservedStr = reservedMessages.join(", ").replace(/\,\s$/, "");

feather.logger.addTemplate("channel-error", errorTemplate);

var errorTypes = {
  UNSUPPORTED_MESSAGE: {
    type: "Unsupported Message",
    message: "Disallowed or reserved message type attempt. Reserved messages: " + reservedStr
  },
  DIRECT_MESSAGE_NOT_ALLOWED: {
    type: "Direct Messages Not Allowed",
    message: "Direct Messaging is not enabled on this channel."
  },
  GROUPS_NOT_ALLOWED: {
    type: "Groups Not Allowed",
    message: "Groups are not enabled on this channel."
  },
  NOT_SUBSCRIBED: {
    type: "Not Subscribed",
    message: "Client is not subscribed to this channel."
  },
  INVALID_GROUP: {
    type: "Invalid Group",
    message: "The group name specified does not exist."
  },
  NOT_GROUP_MEMBER: {
    type: "Not Group Member",
    message: "Client is not a member of this group."
  }
};

var groupRegex = /^group\:.*$/;
var groupNameRegex = /^group\:([^\:]*).*$/;
var groupMessageRegex = /^group\:[^\:]*\:(.*)$/;

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
    if (this.options.allowGroups) {
      this.groups = {};
    }
  },
  handleMessage: function(client, messageData) {
    var message = messageData.message,
      data = messageData.data;
    //special case 'subscribe' since all other actions require subscription first
    if (message === "subscribe") {
      this.add(client, data);
    } else {
      if (this.itemCache[client.sessionId]) {
        //special case group:* messages
        if (groupMessageRegex.test(message)) {
          this.handleGroupMessage(client, messageData);
        } else if (groupRegex.test(message)) { 
          me.error(
            client, 
            errorTypes.UNSUPPORTED_MESSAGE, 
            messageData
          );
        } else {
          switch (message) {
            case "unsubscribe":
              this.remove(client);
              break;
            default:
              this.send(client, message, data, messageData.toClients);
              break;
          }
        }
      } else {
        this.error(
          client,
          errorTypes.NOT_SUBSCRIBED
        );
      }
    }    
  },
  handleGroupMessage: function(client, messageData) {
    var me = this,
      fullMessage = messageData.message,
      data = messageData.data,
      groupName = fullMessage.replace(groupNameRegex, "$1");
    var message = fullMessage.replace(groupMessageRegex, "$1");
    if (message === "") { //join request
      this.joinGroup(client, groupName, messageData);
    } else if (message === ":") { //leaving the group
      this.leaveGroup(client, groupName);
    } else {
      if (!this.groups[groupName]) { //valid group?
        this.error(
          client,
          errorTypes.INVALID_GROUP,
          messageData
        );
      } else if (this.groups[groupName].clients.indexOf(client) == -1) { //is client member of group?
        this.error(
          client,
          errorTypes.NOT_GROUP_MEMBER,
          messageData
        );
      } else {
        //apply message restrictions if they exist
        var group = this.groups[groupName];
        if (!me.options.messages || me.options.messages.indexOf(message) > -1) {
          var _uuid = me.clientIds[client.sessionId];
          group.clients.each(function(_client) {
            if (_client //sanity check
                && (me.options.bouncing || _client !== client)) { //don't send message back to author unless bouncing is on
              _client.send({
                type: "channel",
                channelId: me.id,
                message: fullMessage,
                data: {
                  clientId: _uuid,
                  data: data
                }
              });
            }
          });
        }
      }
    }
  },
  add: function($super, client, data) {
    var added = $super(client, true);
    if (added) {
      var me = this;
      //create a channel specific uuid to avoid exposing underlying socket.io ids to other clients
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
    var removed = $super(client);
    if (removed) {
      var _uuid = me.clientIds[client.sessionId];
      delete me.clientIds[client.sessionId];
      delete me.crossIndexedClients[_uuid];
      if (me.options.announceConnections) {
        me.each(function(_client) {
          if (_client !== client) {
            _client.send({
              type: "channel",
              channelId: me.id,
              message: "disconnection",
              data: {
                clientId: _uuid
              }
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
    }
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
        var _uuid = me.clientIds[client.sessionId];
        collection.each(function(_client) {
          _client = typeof _client === "string" ? me.crossIndexedClients[_client] : _client;
          if (_client //sanity check
              && (me.options.bouncing || _client !== client)) { //don't send message back to author unless bouncing is on
            _client.send({
              type: "channel",
              channelId: me.id,
              message: message,
              data: {
                clientId: _uuid,
                data: data
              }
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
  joinGroup: function(client, groupName, data) {
    var me = this;
    if (!me.options.allowGroups) {
      me.error(
        client,
        errorTypes.GROUPS_NOT_ALLOWED
      );
    } else {
      var group = me.groups[groupName];
      if (!group) {
        me.groups[groupName] = {
          secure: data.secure,
          createdBy: client.sessionId,
          clients: []
        };
        group = me.groups[groupName];
        if (group.secure) {
          group.invites = {};
        }
      }
      group.clients.push(client);
      var _uuid = me.clientIds[client.sessionId];
      var len = group.clients.length;
      group.clients.each(function(_client) {
        _client.send({
          type: "channel",
          channelId: me.id,
          message: "group:" + groupName,
          data: {
            clientId: _uuid,
            memberCount: len
          }
        });
      });
    }
  },
  leaveGroup: function(client, groupName) {
    var me = this;
    if (!me.options.allowGroups) {
      me.error(
        client,
        errorTypes.GROUPS_NOT_ALLOWED
      );
    } else {
      var group = me.groups[groupName];
      if (!group) {
        this.error(
          client,
          errorTypes.INVALID_GROUP,
          {groupName: groupName}
        );
      } else {
        //send :leave: message to all members, including self, but report 1 less member
        var _uuid = me.clientIds[client.sessionId];
        var len = group.clients.length - 1;
        group.clients.each(function(_client) {
          _client.send({
            type: "channel",
            channelId: me.id,
            message: "group:" + groupName + ":leave:",
            data: {
              clientId: _uuid,
              memberCount: len
            }
          });
        });
        group.clients = _.without(group.clients, client);
      }
    }
  },
  error: function(client, errorType, errorData) {
    if (!client || !errorType) return;
    var me = this;
    client.send({
      type: "channel",
      channelId: me.id,
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