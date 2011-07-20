var id = require("./simple-id"),
  _ = require("underscore")._;

/**
 * @class
 * The lowest level for all feather objects (namely widgets, etc)
 * @param {Object} options
 * @param {Object} defaults
 */
var BaseClass = module.exports = function(options, defaults) {
  options = _.extend(defaults || {}, options);
  this.id = options.id || id();
  this.options = options;
};

/**
 * Disposes of all members of this class by setting them to null.
 * @memberOf BaseClass
 */
BaseClass.prototype.dispose = function() {
  for (var p in this) {
    this[p] = null;
  }
};