(function() {

  /**
   * @class
   * The lowest level for all feather objects (namely widgets, etc)
   * @param {Object} options
   * @param {Object} defaults
   */
  var BaseClass = feather.BaseClass = function(options, defaults) {
    options = _.extend(defaults || {}, options);
    this.id = options.id || feather.id();
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
  
})();