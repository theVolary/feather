var id = require("./simple-id");

var bc = module.exports = function(options) {
  options = options || {};
  this.id = options.id || id.id();
  this.options = options;
};

bc.prototype.dispose = function() {
  for (var p in this) {
    this[p] = null;
  }
};