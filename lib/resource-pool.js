var Registry = require("./registry"),
    Semaphore = require('./semaphore'),
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
  this.lockTimeout = options.lockTimeout? options.lockTimeout * 1000 : 0
  this.maxIdle = options.maxIdle || 0

  // clamp the max idle to at least the min.
  if (this.maxIdle !== 0 && this.maxIdle < this.min) {
    this.maxIdle = this.min;
  }

  var me = this;

  //allow bolt-on createResource providers via configuration
  //NOTE: any supplied options.createResource function will
  //override any class-level implementation
  if (typeof options.createResource === "function") {
    this.createResource = options.createResource;
  }
  if (typeof options.createResourceAsync === "function") {
    this.createResourceAsync = options.createResourceAsync;
  }

  //init the min number of resources
  if (this.min) {
    for (var i = 0; i < this.min; i++) {
      if (this.createResourceAsync) {
        this.createResourceAsync(function(err, resource) {
          if (err) {
            // Uh oh!
          } else {
            me.add(resource);
          }
        });
      } else {
        this.add(this.createResource());
      }
    }
  }
};

var lockResource = function(pool, resource) {
  resource.locked = true;
  if (pool.lockTimeout > 0) {
    resource.lockTimer = setTimeout(function() {

      // don't mark it as unlocked, or it could get reallocated.  Just remove it from the pool and dispose it.
      pool.fire('resourceTimeout', { id: resource.id });
      pool.remove(resource)
      if (resource.dispose) {
        resource.dispose()
      }
    }, pool.lockTimeout)
  }
};

var unlockResource = function(resource) {
  resource.locked = false;
  if (resource.lockTimer) {
    clearTimeout(resource.lockTimer);
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
    lockResource(me, resource)
    cb(resource);
  } else {
    //if we're not yet at the max for this pool, create a new resource
    if (this.items.length < this.max) {
      var resource;
      var sem = new Semaphore(function() {
        lockResource(me, resource)
        me.add(resource);
        me.fire('resourceAllocated', {id: resource.id});
        cb(resource);
      });
      sem.increment();
      if (me.createResourceAsync) {
        sem.increment();
        me.createResourceAsync(function(err, res) {
          resource = res;
          sem.execute();
        })
      } else {
        resource = this.createResource();
      }
      sem.execute();
    } else {
      //now we have to wait until one is freed up
      this.once("resourceReleased", function(args) {
        //try again (do it this way in case someone else was in line first)
        me.getResource(cb);
      });
    }
  }
};

ResourcePool.prototype.getStats = function(cb) {
  var me = this;
  var lockCount = 0;
  me.each(function(resource) {
    if (resource.locked) lockCount += 1;
  });
  cb({
    min: me.min,
    max: me.max,
    active: me.items.length,
    locked: lockCount,
    unlocked: me.items.length - lockCount,
    available: me.max - lockCount
  })
};

/**
 * Releases a resource back to the pool
 * @param {Object} resource
 */
ResourcePool.prototype.release = function(resource) {
  var me = this;
  unlockResource(resource);
  me.fire("resourceReleased", {id: resource.id});

  // clean up extras
  me.getStats(function(stats) {
    if (stats.unlocked > me.maxIdle) {
      var extra = stats.unlocked - me.maxIdle
      if (extra > me.min) {
        for (var i = 0; i < extra; i++) {
          var resource = me.find(function(item) {
            return !item.locked;
          });
          if (resource) {
            me.remove(resource);
            if (resource.dispose) resource.dispose();
          }
        }
      }
    }
  });
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
