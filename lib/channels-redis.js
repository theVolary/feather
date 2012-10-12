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

  //auto "redis-ify" the instance
  upgrade(this);
};

//helper function to upgrade vanilla channels to be REDIS backed...
var upgrade = module.exports.upgrade = function(instance) {
  //while RedisChannel itself is a local class (based on Channel), it must contain a distributed event publisher to track inter-process clients / events
  var redisEvents = new RedisEventPublisher({
    id: instance.id + '.events',

    on: {
      'connection.d': function(eventData) {
        //loop channel clients and send data
        instance.each(function(_client) {
          if (instance.channelClient.id != _client.id) {
            _client.json.send(eventData);
          }
        });
      },

      'disconnection.d': function(eventData) {
        //loop channel clients and send data
        instance.each(function(_client) {
          if (instance.channelClient.id != _client.id) {
            _client.json.send(eventData);
          }
        });
      },

      'message.d': function(eventData, toClients) {
        var collection = toClients || instance.items;
        //loop eligible clients
        _.each(collection, function(_client) {
          _client = typeof _client === "string" ? instance.crossIndexedClients[_client] : _client;
          if (_client //sanity check
              && _client.id != instance.channelClient.id) {
            
            _client.json.send(eventData);
          }
        });
      }
    }
  });

  //listen to local events and redistribute via REDIS
  instance.on('connection', function(eventData) {
    redisEvents.fire('connection', eventData);
  });

  instance.on('disconnection', function(eventData) {
    redisEvents.fire('disconnection', eventData);
  });

  instance.on('message', function(eventData, toClients) {
    redisEvents.fire('message', eventData, toClients);
  });
};

inherits(RedisChannel, Channel);
