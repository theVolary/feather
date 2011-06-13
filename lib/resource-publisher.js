var fs  = require("fs"),
    path = require("path"),
    _ = require("underscore")._,
    inherits = require("inherits"),
    EventPublisher = require("./event-publisher"),
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
  this.content = "";
  this.components = {};
  this.componentOrder = [];
  this.valid = false;
  this.cachePathValid = false;
  this.publishers = new Registry();
};

ResourcePublisher.prototype = {
  // serveContent: function(res) {
  //   if (!this.valid || this.content == "") {
  //     return notFound(res);
  //   }
  //   res.setHeader('Content-Type', this.contentType);
  //   res.setHeader('Content-Length', this.content.length);
  //   res.statusCode = 200;
  //   res.end(this.content);
  // },
  invalidate: function() {
    this.valid = false;
    this.fire('invalidated');
  },
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
  buildCacheContent: function() {
    //feather.logger.debug({message:"Building cache content for " + this.id, category:"feather.respack"});
    var content = "";
    for (var i = 0; i < this.componentOrder.length; i++) {
      content += this.components[this.componentOrder[i]].content;
    }
    this.content = content;
    this.valid = true;
    // var consolidation = this.consolidation;
    // var staticOpts = this.consolidation.serveStatic;
    // TODO: Introduce cache version in here.
    // For non-static, there is nothing to do here.  The serveContent method handles non-static
    // if (consolidation.enabled && serveStatic.enabled) {
    //   if (serveStatic.method === "disk") {
    //     if (! this.cachePathValid) {
    //       if (path.existsSync(serveStatic.diskPath) === false) {
    //         fs.mkdirSync(serveStatic.diskPath, 0644);
    //       }
    //       this.cachePathValid = true;
    //     }
    //     fs.writeFileSync(serveStatic.diskPath+"/"+this.id, this.content);
    //   }
    //   // Add other methods here (CDN, etc.)
    // }
  },

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