var _ = require("underscore")._,
  EventPublisher = require("./event-publisher");

var cache = {};
//if new items are added with a token, only calls to .setItem that provide the same token are allowed to change the cache entry
var readOnlyItems = {};
//coordinate getItemsWait callbacks with events
var publisher = new EventPublisher();

/**
 * @name SimpleCache
 * @class
 */

//writing in callback style (even though this is currently sync), to support an async cache implementation later if needed

/**
 * Gets an item from the cache by key, passing null if no item is found
 * @function
 * @param {Object} key
 * @param {Function} cb receives an error (or null) and the item as parameters
 * @memberOf SimpleCache
 */
var getItem = exports.getItem = function(key, cb) {
  if (typeof cb !== "undefined" && typeof cb !== "function") {
    throw new Error("The 2nd argument (if supplied) is expected to be a callback function");
  }
  if (typeof key !== "string") {
    cb && cb("'key' is expected to be a string value");
  } else if (typeof cache[key] === "undefined") {
    cb && cb(null, null);
  }	else {
    var item = cache[key];
    if (readOnlyItems[key]) {
      item = _.clone(item);
    }
    cb && cb(null, item);
  }
};

/**
 * Gets an items from the cache by key, waiting until the item exists before calling back
 * @function
 * @param {Object} key
 * @param {Function} cb receives an error (or null) and the item as parameters
 * @memberOf SimpleCache
 */
var getItemWait = exports.getItemWait = function(key, cb) {
  if (typeof cb !== "undefined" && typeof cb !== "function") {
    throw new Error("The 2nd argument (if supplied) is expected to be a callback function");
  }
  if (typeof key !== "string") {
    cb && cb("'key' is expected to be a string value");
  } else if (typeof cache[key] === "undefined") {
    cb && publisher.once("itemAdded:" + key, function(item) {
      var _item = item;
      if (readOnlyItems[key]) {
        _item = _.clone(item);
      }
      cb(null, _item);
    });
  } else {
    var item = cache[key];
    if (readOnlyItems[key]) {
      item = _.clone(item);
    }
    cb && cb(null, item);
  }
};

/**
 * Gets a collection of items from the cache by keys. The items are passed in the form of an
 * object whose keys match the cache keys and values are the items from the cache.
 *
 * @function
 * Where items are not present, null is returned.
 * @param {Object} keys
 * @param {Function} cb receives an error (or null) and the items collection as parameters
 * @memberOf SimpleCache
 */
var getItems = exports.getItems = function(keys, cb) {
  if (typeof cb !== "undefined" && typeof cb !== "function") {
    throw new Error("The 2nd argument (if supplied) is expected to be a callback function");
  }
  if (!_.isArray(keys)) {
    cb && cb("'keys' is expected to be an array of string values");
  } else {
    var items = {};
    var sem = keys.length;
    _.each(keys, function(key) {
      getItem(key, function(err, item) {
        if (err) (cb && cb(err)); else {
          items[key] = item;
          sem--;
          if (sem === 0) {
            cb(null, items);
          }
        }
      });
    });
  }
};

/**
 * Gets a collection of items from the cache by keys. The items are passed in the form of an
 * object whose keys match the cache keys and values are the items from the cache.
 *
 * This method will only call back once all keys have items to return.
 * @function
 * @param {Object} keys
 * @param {Function} cb receives an error (or null) and the item collection as parameters
 * @memberOf SimpleCache
 */
var getItemsWait = exports.getItemsWait = function(keys, cb) {
  if (typeof cb !== "undefined" && typeof cb !== "function") {
    throw new Error("The 2nd argument (if supplied) is expected to be a callback function");
  }
  if (!_.isArray(keys)) {
    cb && cb("'keys' is expected to be an array of string values");
  } else {
    var items = {};
    var sem = keys.length;
    _.each(keys, function(key) {
      getItem(key, function(err, item) {
        if (err) (cb && cb(err)); else {
          if (item === null) {
            getItemWait(key, function(err, item) {
              if (err) (cb && cb(err)); else {
                items[key] = item;
                sem--;
                if (sem === 0) {
                  cb(null, items);
                }
              }
            });
          } else {
            items[key] = item;
            sem--;
            if (sem === 0) {
              cb(null, items);
            }
          }
        }
      });
    });
  }
};

/**
 * @function
 * @param {Object} key the key to store the item under
 * @param {Object} value the value to set
 * @param {Function} cb receives an error (or null)
 * @memberOf SimpleCache
 */
var setItem = exports.setItem = function(key, value, cb) {
  if (typeof cb !== "undefined" && typeof cb !== "function") {
    throw new Error("The 3rd argument (if supplied) is expected to be a callback function");
  }
  if (typeof key !== "string") {
    cb && cb("'key' is expected to be a string value");
  } else if (typeof readOnlyItems[key] !== "undefined") {
    cb && cb("Cache item with key '" + key + "' has been marked as read only. You must use .setItemReadOnly(key, value, token, cb) and pass in the same token that was used to create the cache entry in order to edit this item.");
  } else {
    cache[key] = value;
    publisher.fire("itemAdded:" + key, value);
    cb && cb();
  }
};

/**
 * @function
 * @param {Object} key the key to store the item under
 * @param {Object} value the value to set
 * @param {Object} token a token that must be used in the future to modify this cache item
 * @param {Function} cb receives an error (or null)
 * @memberOf SimpleCache
 */
var setItemReadOnly = exports.setItemReadOnly = function(key, value, token, cb) {
  if (typeof cb !== "undefined" && typeof cb !== "function") {
    throw new Error("The 4th argument (if supplied) is expected to be a callback function");
  }
  if (typeof key !== "string") {
    cb && cb("'key' is expected to be a string value");
  } else if (typeof token !== "string") {
    cb && cb("'token' is expected to be a string value");
  } else if (typeof readOnlyItems[key] !== "undefined" && readOnlyItems[key] !== token) {
    cb && cb("Cannot set cache item because supplied token does not match existing one.");
  } else {
    cache[key] = value;
    readOnlyItems[key] = token;
    publisher.fire("itemAdded:" + key, value);
    cb && cb();
  }
};

/**
 * Deletes the item from the cache
 * @function
 * @param {Object} key the key to delete
 * @param {Function} cb receives an error (or null) as a parameter
 * @memberOf SimpleCache
 */
var deleteItem = exports.deleteItem = function(key, cb) {
  if (typeof cb !== "undefined" && typeof cb !== "function") {
    throw new Error("The 2nd argument (if supplied) is expected to be a callback function");
  }
  if (typeof key !== "string") {
    cb && cb("'key' is expected to be a string value");
  } else if (typeof readOnlyItems[key] !== "undefined") {
    cb && cb("Cache item with key '" + key + "' has been marked as read only. You must use .deleteItemReadOnly(key, token, cb) and pass in the same token that was used to create the cache entry in order to delete this item.");
  } else {
    delete cache[key];
    cb && cb();
  }
};

/**
 * Deletes a read-only item from the cache
 * @function
 * @param {Object} key the key to delete
 * @param {Object} token the token originally used to create the read-only item
 * @param {Function} cb receives an error (or null) as a parameter
 * @memberOf SimpleCache
 */
var deleteItemReadOnly = exports.deleteItemReadOnly = function(key, token, cb) {
  if (typeof cb !== "undefined" && typeof cb !== "function") {
    throw new Error("The 3rd argument (if supplied) is expected to be a callback function");
  }
  if (typeof key !== "string") {
    cb && cb("'key' is expected to be a string value");
  } else if (typeof token !== "string") {
    cb && cb("'token' is expected to be a string value");
  } else if (typeof readOnlyItems[key] !== "undefined" && readOnlyItems[key] !== token) {
    cb && cb("Cannot delete cache item because supplied token does not match existing one.");
  } else {
    delete cache[key];
    delete readOnlyItems[key];
    cb && cb();
  }
};

/**
 * Deletes all items from the cache
 * @function
 * @param {Function} cb receives an error (or undefined) as parameter
 * @memberOf SimpleCache
 */
var deleteAll = exports.deleteAll = function(cb) {
  if (typeof cb !== "undefined" && typeof cb !== "function") {
    throw new Error("The 1st argument (if supplied) is expected to be a callback function");
  }
  for (var p in cache) delete cache[p];
  for (var p in readOnlyItems) delete readOnlyItems[p];
  cb && cb();
};