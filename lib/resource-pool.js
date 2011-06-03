var Registry = require("./registry"),
    inherits = require("inherits");

/**
 * Generic class for creating elastic resource pools
 * @name ResourcePool
 * @class
 * @extends feather.lang.registry
 */
/**
 * @constructs
 * @param {Object} $super
 * @param {Object} options Options: <ul class="desc">
 *   <li>min: number, min resources in pool</li>
 *   <li>max: number, max resources in pool</li></ul>
 */
var rp = module.exports = function(options) {
  rp.super.apply(this);
  this.min = options.min;
  this.max = options.max;
  //init the min number of resources
  if (this.min) {
    for (var i = 0; i < this.min; i++) {
      this.add(this.createResource());
    }
  }
};

inherits(rp, Registry);

/**
 * Abstract function.  Must be overridden by subclasses.
 */
rp.prototype.createResource = function() {
  console.error("ResourcePool.createResource must be overriden by a concrete subclass.");
};

/**
 * Retrieves a resource from the pool asynchronously (via the given callback).
 * @param {Object} cb callback to pass the resource to
 */
rp.prototype.getResource = function(cb) {
  var me = this;
  var resource = _.detect(this.items, function(item) {
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
};

/**
 * Releases a resource back to the pool
 * @param {Object} resource
 */
rp.prototype.release = function(resource) {
  resource.locked = false;
  this.fire("resourceReleased");
};