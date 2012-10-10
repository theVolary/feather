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
var channels = new Registry();

/**
 * @class Channels allow events to be published to one or more clients who have subscribed.
 * Clients are added to a channel on successful subscription.
 *
 * @extends RedisRegistry
 */
var RedisChannel = module.exports.RedisChannel = function(options) {
  var me = this;

  RedisChannel.super.call(this, options);

  //require the socket server instance for this class
  if (!this.options.server) {
    throw new Error('RedisChannel instances require a socket.io server instance to be passed in.');
  }

  //while RedisChannel itself is a local class (based on Channel), it must contain a distributed event publisher to track inter-process clients / events
  var redisEvents = new RedisEventPublisher({
    id: this.id + '.events',

    on: {
      'itemAdded.d': function(client) {
        //if item isn't in local store, add a wrapper object
        console.log('RECEIVED CLIENT: ' + JSON.stringify(client));
        var wrapperClient = {
          id: client.id,
          uuid: client.uuid,
          json: {

            // the .json.send method is used by Channel to issue messages out to the clients
            // this wrapper function allows seamless integration of Channel with the REDIS server for distributed configurations
            send: function(packet) {
              var server = me.options.server;

              server.manager.onClientMessage(client.id, packet);
            }
          }
        };

        //don't fire itemAdded in this case
        me.suppressOnce('itemAdded');
        me.add(wrapperClient);
        //unsuppress explicitly in case add failed
        me.unsuppress('itemAdded');
      }
    }
  });

  //wire up handler to distribute itemAdded events
  this.on('itemAdded', function(client) {
    redisEvents.fire('itemAdded', {
      id: client.id,
      uuid: client.uuid
    });
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