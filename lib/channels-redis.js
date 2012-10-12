var _ = require("underscore")._,
  Channel = require('./channels').Channel,
  Registry = require("./registry"),
  RedisRegistry = require("./registry-redis"),
  RedisEventPublisher = require('./event-publisher-redis'),
  uuid = require("node-uuid"), //TODO migrate usage to uuid-pool later
  inherits = require("inherits"),
  cache = require("./simple-cache"),
  console = require('console');

/**
 * @namespace Channels
 * @name Channels
 */

/*
 * A registry to store named channels that can be subscribed to
 */
var channels = require('./channels').channels;

/**
 * @class Channels allow events to be published to one or more clients who have subscribed.
 * Clients are added to a channel on successful subscription.
 *
 * @extends RedisRegistry
 */
var RedisChannel = module.exports.RedisChannel = function(options) {
  var me = this;

  RedisChannel.super.call(this, options);  

  //while RedisChannel itself is a local class (based on Channel), it must contain a distributed event publisher to track inter-process clients / events
  var redisEvents = new RedisEventPublisher({
    id: this.id + '.events',

    on: {
      'connection.d': function(eventData) {
        //loop channel clients and send data
        me.each(function(_client) {
          if (me.channelClient.id != _client.id) {
            _client.json.send(eventData);
          }
        });
      },

      'disconnection.d': function(eventData) {
        //loop channel clients and send data
        me.each(function(_client) {
          if (me.channelClient.id != _client.id) {
            _client.json.send(eventData);
          }
        });
      },

      'message.d': function(eventData, toClients) {
        var collection = toClients || me.items;
        //loop eligible clients
        _.each(collection, function(_client) {
          _client = typeof _client === "string" ? me.crossIndexedClients[_client] : _client;
          if (_client //sanity check
              && _client.id != me.channelClient.id) {
            
            _client.json.send(eventData);
          }
        });
      }
    }
  });

  //listen to local events and redistribute via REDIS
  this.on('connection', function(eventData) {
    redisEvents.fire('connection', eventData);
  });

  this.on('disconnection', function(eventData) {
    redisEvents.fire('disconnection', eventData);
  });

  this.on('message', function(eventData, toClients) {
    redisEvents.fire('message', eventData, toClients);
  });
};

inherits(RedisChannel, Channel);

/**
 * helper method to add channels
 * @function
 * @param {Object} options options to pass to the channel creation.
 * @memberOf Channels
 */
var addChannel = exports.addChannel = function(options) {
  var channel = new RedisChannel(options);
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