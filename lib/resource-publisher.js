var fs  = require("fs"),
    path = require("path"),
    _ = require("underscore")._,
    inherits = require("inherits"),
    FSM = require("./fsm"),
    fileWatcher = require("./filewatcher"),
    Registry = require("./registry");
    
/**
 * @namespace 
 * @name resourcePackager
 */
    

//  * Respond with 404 "Not Found".
 
// function sendNotFound(res) {
//   var body = 'Not Found (Or Invalid Cache)';
//   res.setHeader('Content-Type', 'text/plain');
//   res.setHeader('Content-Length', body.length);
//   res.statusCode = 404;
//   res.end(body);
// }  

/*
 * Class for resource caches
 * TODO: Document options.
 */
function ResourcePublisher(options) {
  ResourcePublisher.super.apply(this, arguments);
  this.id = options.cacheName;
  this.contentType = options.contentType;
  this.publisherOptions = options.publisherOptions;
  this.content = "";
  this.components = {};
  this.componentOrder = [];
  this.valid = false;
  this.cachePathValid = false;
  this.publishers = new Registry();
};

ResourcePublisher.prototype = {
  states: {
    initial: {
      //allows publish requests to queue up until all components have been added
      publish: function(options, callback) {  
        if (!this._publishOptions) {
          this._publishOptions = options;
          this._publishCallback = callback;
        } else {
          this.onceState("published", function(publishResult, callback) {
            callback && callback(null, publishResult);
          });
        }
      },
      ready: function() {
        return this.states.ready;
      }
    },
    ready: {
      stateStartup: function() {
        if (this._publishOptions) {
          this.fire("publish", this._publishOptions, this._publishCallback);
        }
      },
      publish: function(options, callback) {
        return this.states.publishing;
      }
    },
    publishing: {
      stateStartup: function(options, callback) {
        var me = this;
        var publisher = null;
        if (options.publisherId || options.id) {
          var id = options.publisherId || options.id;
          publisher = this.publishers.findById(id);
        } else if (options.publisher) {
          publisher = options.publisher;
        } else {
          // go boom.
        }
        if (publisher) {
          publisher.publish(options, this, function(err, publishResult) {
            if (err) (callback && callback(err)); else {
              me.fire("published", publishResult, callback);
            }
          });
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
      name = options.name,
      content = options.content,
      index = options.index,
      url = options.url;

    var component = {
      content: content,
      index: index,
      url: url,
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
    // Only watch the name if the file exists and it's a file!
    path.exists(name, function(exists) {
      if (exists) {
        fs.stat(name, function(err, stats) {
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
inherits(ResourcePublisher, FSM);
module.exports = ResourcePublisher;