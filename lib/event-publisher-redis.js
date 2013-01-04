var EventPublisher = require("./event-publisher"),
  _ = require("underscore")._,
  inherits = require("inherits"),
  isArray = Array.isArray,
  redis = require("redis"),
  uuid = require('node-uuid');

module.exports = RedisEventPublisher;

var defaultConfig = {
  pub: {},
  sub: {}
};

function RedisEventPublisher(options) {
  options = options || {};
  
  var me = this,
    redisConfig = options.redis || defaultConfig,
    pubConfig = redisConfig.pub || defaultConfig.pub,
    subConfig = redisConfig.sub || defaultConfig.sub;

  RedisEventPublisher.super.call(this, options);

  //setup the redis pub/sub clients
  this.pubClient = redis.createClient(
    pubConfig.port, //default = 6379
    pubConfig.host, //default = 127.0.0.1
    pubConfig.options //default = see https://github.com/mranney/node_redis#rediscreateclientport-host-options
  );

  this.subClient = redis.createClient(
    subConfig.port, //default = 6379
    subConfig.host, //default = 127.0.0.1
    subConfig.options //default = see https://github.com/mranney/node_redis#rediscreateclientport-host-options
  );

  this.channelId = 'redis-events::' + this.id;

  this.subClient.subscribe(this.channelId);
  this.subClient.on('message', function(channel, message) {
    //when we receive an event from another process, only re-fire it locally...
    var args = JSON.parse(message);
    //don't fire events that originated from this instance
    var uuid = args.shift();
    if (uuid !== me.uuid) {
      RedisEventPublisher.prototype.fireLocalOnly.apply(me, args);
      //also fire the same event with a '.d' suffix to denote this was a distributed event (makes it easier to write code that only responds to distributed events, if desired)
      args[0] = args[0] + '.d';
      RedisEventPublisher.prototype.fireLocalOnly.apply(me, args);
    }
  });

  //make distributed dispose work properly
  this.on('disposed.d', function() {
    if (!me.disposing) {
      //this means dispose is being distributed from another process
      me.suppress('disposed'); //make sure local dispose() doesn't fire/distribute disposed event again
      me.dispose();
    }
  });

  //need a local uuid to filter out own events from distributed stream
  this.uuid = uuid();
};

//public setter method to set global REDIS pub/sub server config defaults
RedisEventPublisher.__defineSetter__('config', function(config) {
  defaultConfig = config;
});

//NOTE: add to this array as needed.
var nonDistributableEvents = ['newListener'];

RedisEventPublisher.prototype.emit = RedisEventPublisher.prototype.fire = function (eventName) {
  var args = _.toArray(arguments);

  //local behavior inherited from EventPublisher/EventEmitter
  RedisEventPublisher.super.prototype.emit.apply(this, args);

  //blacklist events from attempting to be distributed
  if (nonDistributableEvents.indexOf(eventName) > -1) return;

  //now distribute the event via REDIS
  //all arguments must be JSON serializable for this class
  try {
    args.unshift(this.uuid); //key the event to this instance to make sure it doesn't get repeated locally
    var pubArgs = JSON.stringify(args);     
    this.pubClient.publish(this.channelId, pubArgs);
  } catch (ex) {
    throw new Error('All arguments to RedisEventPublisher.fire/emit must be JSON serializable');
  }
  
};

RedisEventPublisher.prototype.emitLocalOnly = RedisEventPublisher.prototype.fireLocalOnly = function() {
  //only perform local ops
  //local behavior inherited from EventPublisher/EventEmitter
  RedisEventPublisher.super.prototype.emit.apply(this, arguments);
};

RedisEventPublisher.prototype.dispose = function() {
  this.disposing = true;

  var subClient = this.subClient,
    pubClient = this.pubClient;

  subClient.unsubscribe();

  //need to disconnect the clients on the next tick because the EventPublisher class fires 'disposed'
  //which we still need the pub client to distribute to support distributed dispose,
  //note: needed to grab local var references because base dispose will nullify all instance members
  process.nextTick(function() {
    subClient.end();
    pubClient.end();
  });

  RedisEventPublisher.super.prototype.dispose.apply(this, arguments);  
};

inherits(RedisEventPublisher, EventPublisher);
