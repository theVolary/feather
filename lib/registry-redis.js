var inherits = require("inherits"),
  _ = require("underscore")._,
  redis = require("redis"),
  EventPublisher = require('./event-publisher');

module.exports = RedisRegistry;

function RedisRegistry(options) {
  RedisRegistry.super.call(this, _.extend({
    idKey: "id",
    uniqueErrorMessage: "All items in this registry instance must have unique IDs."
  }, options || {}));

  //setup a redis client
  this.client = redis.createClient(
    this.options.redisPort, //default = 6379
    this.options.redisHost, //default = 127.0.0.1
    this.options.redisOptions //default = see https://github.com/mranney/node_redis#rediscreateclientport-host-options
  );

  //create a redis hash key for this registry
  this.hashId = 'redis-registry::' + this.id;
}

RedisRegistry.prototype = {

  add: function(item, cb) { 
    var me = this,
      idKey = this.options.idKey,
      options = this.options,
      itemJSON;  

    if (item[idKey]) {
      
      //items MUST be JSON serializable for this registry
      try {
        itemJSON = JSON.stringify(item);
      } catch (ex) {
        itemJSON = null;
        cb('Error serializing item to add to registry.', ex);
      }

      if (itemJSON) {
        //enforce unique keys (only set value if hash key does not yet exist)
        me.client.hsetnx(me.hashId, item[idKey], itemJSON, function(err, result) {
          if (err) cb('Error adding item to registry.', err); else {

            //result == 1 if item was successfully set, 0 otherwise
            if (!result) {
              cb(options.uniqueErrorMessage + "... id: " + item[idKey]);
            } else {

              //TODO: the events need to be backed by redis also (via redis pub/sub)
              me.fire("itemAdded", item);
              cb();
            }
          }
        });
      }
      
    } else {
      cb("Items in this registry must have '" + idKey + "' properties in order to be added.");
    }
  },
  
  /**
   * Copy items from one collection based object (basically any object that supports .each enumeration)
   * into this registry instance
   * @param {Array} collection
   */
  addRange: function(collection, cb) {
    var me = this,
      errors = [],
      sem = 0;

    _.each(collection, function(item) {
      sem++;
      me.add(item, function(err) {
        if (err) errors.push(err);

        sem--;
        if (sem == 0) {
          if (errors.length) {
            cb(errors);
          } else {
            cb();
          }
        }
      });
    });
  },
  
  /**
   * Finds an item in the registry
   * @param {Function} iterator   Function which returns true when the desired item is found
   */
  find: function(iterator, cb) {
    //TODO: currently this will be pretty inefficient due to buffering all and deserializing. May need to investigate better way.
    this.client.hvals(this.hashId, function(err, itemsJSON) {
      if (err) cb(err); else {
        try {
          var items = _.map(itemsJSON, function(itemJSON) {
            return JSON.parse(itemJSON);
          });
          cb(null, _.find(items, iterator));
        } catch (ex) {
          cb('Error parsing items during find.', ex);
        }
      }
    });
  },

  length: function(cb) {
    this.client.hlen(this.hashId, cb);
  },
  
  /**
   * Returns all items in the registry
   * @param {Function} iterator   Function which returns true when the desired item is found
   */
  getAll: function(cb) {
    //TODO: currently this will be pretty inefficient due to buffering all and deserializing. May need to investigate better way.
    this.client.hvals(this.hashId, function(err, itemsJSON) {
      if (err) cb(err); else {
        try {
          var items = _.map(itemsJSON, function(itemJSON) {
            return JSON.parse(itemJSON);
          });
          cb(null, items);
        } catch (ex) {
          cb('Error parsing items during getAll.', ex);
        }
      }
    });
  },

  /**
   * Finds all matching items in the registry
   * @param {Function} iterator   Function which returns true when the desired item is found
   */
  findAll: function(iterator, cb) {
    this.getAll(function(err, items) {
      if (err) cb(err); else {
        cb(null, _.filter(items, iterator));
      }
    });
  },
  
  /**
   * Finds an item in the registry by ID
   *
   * @param {String} id ID of the registry item
   */
  findById: function(id, cb) {
    this.client.hget(this.hashId, id, function(err, itemJSON) {
      if (err) cb(err); else {
        if (!itemJSON) cb(null, null); else {
          try {
            var item = JSON.parse(itemJSON);
            cb(null, item);
          } catch (ex) {
            cb('Error parsing item during findById.', ex);
          }
        }
      }
    });
  },
  
  /**
   * Removes an item from the registry by ID
   * @param {String} id   ID of the registry item
   */
  removeById: function(id, cb) {
    var me = this;
    //get the item first for event firing
    this.findById(id, function(err, item) {
      if (err) cb(err); else {
        if (!item) cb(null, false); else {
          me.client.hdel(me.hashId, id, function(err, result) {
            if (err) cb(err); else if (result) {

              //TODO: use redis pub/sub to back the events... (need to distribute to any other connected processes)
              me.fire('itemRemoved', item);
              //check for cleared status
              me.client.hlen(me.hashId, function(err, len) {
                if (!err && !len) {
                  me.fire('cleared');
                }

                cb(err, true);
              });
            } else {

              cb(null, false);
            }
          });
        }
      }
    })
  },
  
  /**
   * Removes an item from the registry
   * @param {Object} item The registry item
   */
  remove: function(item, cb) {
    this.removeById(item[this.options.idKey], cb);
  },
  
  /**
   * Removes all items from the registry, with events
   */
  removeAll: function(cb) {
    var me = this,
      sem = 0;

    //don't use each here because we only need the keys (each adds parsing overhead)
    this.client.hkeys(this.hashId, function(err, keys) {
      if (err) cb(err); else {
        if (!keys || !keys.length) cb(); else {
          var errors = [];
          _.each(keys, function(key) {
            sem++;
            me.removeById(key, function(err) {
              if (err) errors.push(err);

              sem--;
              if (sem == 0) {
                if (!errors.length) errors = null;
                cb(errors);
              }
            });
          });
        }
      }
    });
  },
  
  /**
   * Performs an action on each item in the registry
   * @param {Function} iterator   Function containing code to execute on each item
   */
  each: function(iterator, cb) {
    var me = this;

    this.getAll(function(err, items) {
      if (err) cb(err); else {
        _.each(items, iterator);
        cb();
      }
    });
  },
  
  /**
   * Disposes of this registry.
   * @param {Object} $super
   */
  dispose: function(cb) {
    var me = this,
      args = _.toArray(arguments);

    this.removeAll(function(err) {
      RedisRegistry.super.prototype.dispose.apply(me, args);

      //TODO: remove this once RedisEventPublisher is done (cb will be called in that dispose method then)
      process.nextTick(cb);
    });    
  }
};

inherits(RedisRegistry, EventPublisher);
