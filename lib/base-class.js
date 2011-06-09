var id = require("./simple-id"),
  _ = require("underscore")._;

var bc = module.exports = function(options, defaults) {
  options = _.extend(defaults || {}, options);
  this.id = options.id || id();
  this.options = options;
};

bc.prototype.dispose = function() {
  for (var p in this) {
    this[p] = null;
  }
};