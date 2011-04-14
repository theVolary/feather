/**
 * Generic class for creating elastic resource pools
 * @param {Object} $super
 * @param {Object} options
 */
exports.ResourcePool = Class.create(feather.lang.registry, {
  initialize: function($super, options) {
    $super(options);
    this.min = options.min;
    this.max = options.max;
    //init the min number of resources
    if (this.min) {
      for (var i = 0; i < this.min; i++) {
        this.add(this.createResource());
      }
    }
  },
  createResource: function() {
    feather.logger.error("ResourcePool.createResource must be overriden by a concrete subclass.");
  },
  getResource: function(cb) {
    var me = this;
    var resource = this.items.find(function(item) {
      return !item.locked;
    });
    if (resource) {
      resource.locked = true;
      cb(resource);
    } else {
      //if we're not yet at the max for this pool, create a new resource
      if (this.items.length < this.max) {
        resource = this.createResource();
        resource.locked = true;
        this.add(resource);
        cb(resource);
      } else {
        //now we have to wait until one is freed up
        this.once("resourceReleased", function(args) {
          //try again (do it this way in case someone else was in line first)
          me.getResource(cb);
        });
      }
    }
  },
  release: function(resource) {
    resource.locked = false;
    this.fire("resourceReleased");
  }
});
