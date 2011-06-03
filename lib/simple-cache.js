var _ = require("underscore")._;

var cache = {};
//if new items are added with a token, only calls to .setItem that provide the same token are allowed to change the cache entry
var readOnlyItems = {};

//writing in callback style (even though this is currently sync), to support an async cache implementation later if needed

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
    cb && cb();
  }
};

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
    cb && cb();
  }
};

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