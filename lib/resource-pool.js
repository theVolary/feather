var Registry = require("./registry"),
    inherits = require("inherits"),
    id = require("./simple-id");
/**
 * Generic class for creating elastic resource pools
 * @class
 * @extends Registry
 * @param {Object} options Options: <ul class="desc">
 *   <li>min: number, min resources in pool</li>
 *   <li>max: number, max resources in pool</li></ul>
 */
var ResourcePool = module.exports = function(options) {
  ResourcePool.super.apply(this);
  this.min = options.min;
  this.max = options.max;
  
  //allow bolt-on createResource providers via configuration
  //NOTE: any supplied options.createResource function will
  //override any class-level implementation
  if (typeof options.createResource === "function") {
    this.createResource = options.createResource;
  }

  //init the min number of resources
  if (this.min) {
    for (var i = 0; i < this.min; i++) {
      this.add(this.createResource());
    }
  }
};

/**
 * Default implementation just returns an empty object. This makes this class useable
 * as a simple throttling mechanism for parallel processes. Override createResource
 * to return actually useful objects if you need more than just a throttle (see feather's /lib/dom.js for an example)
 */
ResourcePool.prototype.createResource = function() {
  return {id: id()};
};

/**
 * Retrieves a resource from the pool asynchronously (via the given callback).
 * @param {Object} cb callback to pass the resource to
 */
ResourcePool.prototype.getResource = function(cb) {
  var me = this;
  var resource = this.find(function(item) {
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
ResourcePool.prototype.release = function(resource) {
  resource.locked = false;
  this.fire("resourceReleased");
};

ResourcePool.prototype.dispose = function() {
  var me = this;
  this.each(function(item) {
    if (typeof item.dispose === "function") item.dispose();
    me.release(item);
  });
  ResourcePool.super.prototype.dispose.apply(this, arguments);
};

inherits(ResourcePool, Registry);
