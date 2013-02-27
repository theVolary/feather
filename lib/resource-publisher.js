var fs  = require("fs"),
    path = require("path"),
    _ = require("underscore")._,
    inherits = require("inherits"),
    FSM = require("./fsm"),
    fileWatcher = require("./filewatcher"),
    Registry = require("./registry"),
    console = require("console");
    
/**
 * @class This class represents a resource publisher / cache.  It allows multiple components to be aggregated together into one cache, and published on demand.
 * @param {Object} options
 * @extends EventPublisher
 */
function ResourcePublisher(options) {
  ResourcePublisher.super.apply(this, arguments);
  this.id = options.cacheName;
  this.contentType = options.contentType;
  this.publishType = options.publishType;
  this.publisherOptions = options.publisherOptions;
  this.content = options.content || "";
  this.components = {};
  this.componentOrder = [];
  this.valid = false;
  this.cachePathValid = false;
  this.publishers = new Registry();
}

ResourcePublisher.prototype = {
  /**
   * Invalidates this publisher's cache and fires an invalidated event.
   */
  states: {
    initial: {
      publish: function(options, callback) {
        return this.states.publishing;
      }
    },
    publishing: {
      stateStartup: function(options, callback) {
        var me = this,
            selectedPublisher = null,
            publisherOptions = options.publisherOptions;
        if (!publisherOptions) debugger;
        if (publisherOptions.publisherId || publisherOptions.id) {
          var id = publisherOptions.publisherId || publisherOptions.id;
          selectedPublisher = this.publishers.findById(id);
        } else if (publisherOptions.publisher) {
          selectedPublisher = publisherOptions.publisher;
        } else {
          // go boom.
        }
        if (selectedPublisher) {
          if (me.options.publishType === "pageContent") {

            selectedPublisher.publishPage(options, this, function(err, publishResult) {
              if (err) (callback && callback(err)); else {
                me.fire("published", publishResult, callback);
              }
            });
          } else {
            selectedPublisher.publish(options, this, function(err, publishResult) {
              if (err) (callback && callback(err)); else {
                me.fire("published", publishResult, callback);
              }
            });
          }
        } else {
           // No publisher specified. Error condition.
          callback && callback("No underlying publisher was specified. Cannot publish.");

          //go back to previous state in case calling code wants to try to resolve the situation and try again
          return this.previousState;
        }
      },
      //allows additional pseudo-requests to queue up
      publish: function(options, callback) {
        var me = this;
        this.onceState("published", function(publishResult, callback) {
          callback && callback(null, publishResult);
        });
      },
      published: function(publishResult, callback) {
        return this.states.published;
      }
    },
    published: {
      stateStartup: function(publishResult, callback) {
        this.publishResult = publishResult;
        callback && callback(null, publishResult);
      },
      publish: function(options, callback) {
        callback && callback(null, this.publishResult);
      },
      flushCache: function() {
        return this.states.initial;
      }
    }
  },
  invalidate: function() {
    this.valid = false;
    this.fire('invalidated');
  },

  makeReady: function() {
    //let the FSM handle things...
    this.fire("ready");
  },
  addComponent: function(options, callback) {
    var me = this,
      name = options.name;

    var component = {
      content: options.content,
      index: options.index,
      url: options.url,
      relativePath: options.relativePath || '',
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

    //TODO: evaluate the file-watching stuff below. We weren't actually using it to do anything at a higher level,
    // so I'm commenting it out for now (as placeholder)... delete if time passes and we feel this isn't going to come back
    // - the following line was copied from within the fs.stat callback in the commented code (remove this if that block gets uncommented)
    callback && callback(null, component);

    // Only watch the name if the file exists and it's a file!
    // fs.exists(name, function(exists) {
    //   if (exists) {
    //     fs.stat(name, function(err, stats) {
    //       if (err) {
    //         this.removeComponent(name);
    //         callback && callback(err);
    //       } else if (stats.isFile()) {
    //         component.watching = true;
    //         fileWatcher.watchFileMtime(name, component.changeListener);
    //         callback && callback(null, component);
    //         me.fire('componentAdded', component);
    //       }
    //     });
    //   } else {
    //     callback && callback("path " + name + " does not exist.");
    //     this.fire('componentAdded', component);
    //   }
    // });
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
  
  flushCache: function() {
    var me = this;
    _.each(_.keys(this.components), function(key) {

      me.removeComponent(key);
    });
    me.newCache = true;
    me.fire('flushCache'); //should reset the publishing state
  },

  concat: function() {
    var content = "";
    for (var i = 0; i < this.componentOrder.length; i++) {
      var name = this.componentOrder[i];
      content += "\n\n/* ========== " + path.basename(name) + " ========== */\n\n" + this.components[name].content;
    }
    return content;
  },
  publish: function(options, callback) {
    this.fire("publish", options, callback); //let the fsm control the rest
  },
  componentChanged: function(name) {
    var me = this;
    var oldContent = this.components[name];
    fs.readFile(name, "utf8", function(err, data) {
      if (err) {
      } else {
        me.components[name].content = data;
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
    if (this.publishers) {
      this.publishers.dispose();
    }
    ResourcePublisher.super.prototype.dispose.apply(this, arguments);
  }
};
inherits(ResourcePublisher, FSM);
module.exports = ResourcePublisher;