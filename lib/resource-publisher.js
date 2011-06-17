var fs  = require("fs"),
    path = require("path"),
    _ = require("underscore")._,
    inherits = require("inherits"),
    EventPublisher = require("./event-publisher"),
    fileWatcher = require("./filewatcher"),
    Registry = require("./registry");

/**
 * @class This class represents a resource publisher / cache.  It allows multiple components to be aggregated together into one cache, and published on demand.
 * @param {Object} options
 */
function ResourcePublisher(options) {
  ResourcePublisher.super.apply(this, arguments);
  this.id = options.cacheName;
  this.contentType = options.contentType;
  this.content = "";
  this.components = {};
  this.componentOrder = [];
  this.valid = false;
  this.cachePathValid = false;
  this.publishers = new Registry();
};

ResourcePublisher.prototype = {
  /**
   * Invalidates this publisher's cache and fires an invalidated event.
   */
  invalidate: function() {
    this.valid = false;
    this.fire('invalidated');
  },

  /**
   * Adds a component to this publisher.
   * @param {String} name the name of the component.  This must be the file's path if you want the publisher to watch the component for changes.
   * @param {String} content the content for the component
   * @param {Number} index the order the component should appear in the over published content.  This is necesarry due to asynchronous additions.
   * @param {Function} callback called when the addition is complete.  First parameter is an error, or null if successful.
   */
  addComponent: function(name, content, index, callback) {
    var me = this;
    var component = {
      content: content,
      index: index,
      changeListener: function(args) {
        me.componentChanged(name);
      },
      watching: false
    };
    this.components[name] = component;
    this.componentOrder.push(name);
    this.componentOrder = _.sortBy(this.componentOrder, function(compName) {
      return me.components[compName].index;
    });
    this.buildCacheContent();
    // Only watch the name if the file exists and it's a file!
    path.exists(name, function(exists) {
      if (exists) {
        fs.stat(name, function(err, stats) {
          if (!err) {
            // console.log(require("util").inspect(stats));
            // console.log(name + ": stats isFile? " + stats.isFile() + "; isDirectory()? " + stats.isDirectory() + "; isBlockDevice? " + stats.isBlockDevice() + "; isCharacterDevice? " + stats.isCharacterDevice() + "; isFIFO? " + stats.isFIFO() + "; isSocket? " + stats.isSocket());
          }
          if (err) {
            this.removeComponent(name);
            callback && callback(err);
          } else if (stats.isFile()) {
            component.watching = true;
            fileWatcher.watchFileMtime(name, component.changeListener);
            callback && callback(null, component);
            me.fire('componentAdded', component);
          }
        });
      } else {
        callback && callback("path " + name + " does not exist.");
        this.fire('componentAdded', component);
      }
    });
  },

  /**
   * Removes the named component from this publisher.  Fires "componentRemoved" event on completion.
   * @param {String} name the component to remove.
   */
  removeComponent: function(name) {
    if (this.components[name]) {
      var component = this.components[name];
      this.components[name] = null;
      this.componentOrder = _.reject(this.componentOrder, function(it) { return it === name; });
      if (component.watching) {
        fileWatcher.unwatchFile(name, component.changeListener);
      }
      this.fire('componentRemoved', name);
    }
  },

  /**
   * Builds the aggregated content from all of the components.  Usually you will not have to call this method yourself.
   */
  buildCacheContent: function() {
    //feather.logger.debug({message:"Building cache content for " + this.id, category:"feather.respack"});
    var content = "";
    for (var i = 0; i < this.componentOrder.length; i++) {
      var name = this.componentOrder[i];
      content += "\n\n/* ========== " + path.basename(name) + " ========== */\n\n" + this.components[name].content;
    }
    this.content = content;
    this.valid = true;
  },

  /**
   * Publishes the content.
   * @param {Object} options publishing options.  Options should include one of the following: publisherId / id, or publisher.  publisherId should be the id of the configured publisher to use.  publisher should be a custom publisher object.
   * @param {Function} callback called upon completion.  The callback is passed the error that occurred, or null if successful.
   */
  publish: function(options, callback) {
    if (this.valid) {
      var publisher = null;
      if (options.publisherId || options.id) {
        var id = options.publisherId || options.id;
        publisher = this.publishers.findById(id);
      } else if (options.publisher) {
        publisher = options.publisher;
      } else {
        // go boom.
      }
      var pubOpts = _.extend(_.clone(options.config), {
        id: this.id
      });
      if (publisher) {
        publisher.publish(pubOpts, this.content, callback);
      } else {
        callback && callback(); // No publisher specified.  Pass right back through.
      }
    } else {
      callback && callback("resource publisher " + this.id + " is invalid.  Cannot publish");
    }
  },

  componentChanged: function(name) {
    var me = this;
    //feather.logger.debug({message:"Cache ${id} component ${name} changed.  Updating cache.", replacements:{id:this.id,name:name}, category:"feather.respack"});
    var oldContent = this.components[name];
    fs.readFile(name, "utf8", function(err, data) {
      if (err) {
        //feather.logger.error({message:"Cannot update cache.  Error reading file " + name, category:"feather.respack", exception:err});
      } else {
        me.components[name].content = data;
        me.buildCacheContent();
        me.fire('componentChanged', name);
      }
    });
  },

  /**
   * Diposes of this publisher.  All components are disposed of and any watched files are cleaned up before disposing.
   */
  dispose: function() {
    
    // Dispose of all of the components.
    for (var i = 0; i < this.componentOrder.length; i++) {
      var name = this.componentOrder[i];
      if (this.components[name].watching) {
        fileWatcher.unwatchFile(name, this.components[name].changeListener);
      }
      this.components[name] = null;
    }
    ResourcePublisher.super.prototype.dispose.apply(this, arguments);
  }
};
inherits(ResourcePublisher, EventPublisher);
module.exports = ResourcePublisher;