var util = require("util"),
    fs  = require("fs"),
    path = require("path"),
    inherits = require("inherits"),
    eventPub = require("./event-publisher"),
    registry = require("./registry");
    
/**
 * @namespace 
 * @name resourcePackager
 */
    
/*
 * Respond with 404 "Not Found".
 */
function notFound(res) {
  var body = 'Not Found (Or Invalid Cache)';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', body.length);
  res.statusCode = 404;
  res.end(body);
}  

/*
 * Class for resource caches
 */
function ResourceCache(options) {
  this.id = options.cacheName;
  this.contentType = options.contentType;
  this.content = "";
  this.components = {};
  this.componentOrder = [];
  this.valid = false;
  this.eventDispatcher = options.eventDispatcher;
};

ResourceCache.prototype = {
  serveContent: function(res) {
    if (!this.valid || this.content == "") {
      return notFound(res);
    }
    res.setHeader('Content-Type', this.contentType);
    res.setHeader('Content-Length', this.content.length);
    res.statusCode = 200;
    res.end(this.content);
  },
  invalidate: function() {
    this.valid = false;
  },
  addComponent: function(name, content) {
    var me = this;
    var component = {
      content: content,
      changeListener: function(stats) {
        if (stats.curr.mtime.getTime() !== stats.prev.mtime.getTime()) {
          me.componentChanged(name);
        }
      }
    };
    this.components[name] = component;
    this.componentOrder.push(name);
    this.buildCacheContent();
    if (this.eventDispatcher) {
      this.eventDispatcher.on("filechange:" + name, component.changeListener);
    }
  },
  buildCacheContent: function() {
    feather.logger.debug({message:"Building cache content for " + this.id, category:"feather.respack"});
    var content = "";
    for (var i = 0; i < this.componentOrder.length; i++) {
      content += this.components[this.componentOrder[i]].content;
    }
    this.content = content;
    this.valid = true;
  },
  componentChanged: function(name) {
    var me = this;
    feather.logger.debug({message:"Cache ${id} component ${name} changed.  Updating cache.", replacements:{id:this.id,name:name}, category:"feather.respack"});
    var oldContent = this.components[name];
    fs.readFile(name, "utf8", function(err, data) {
      if (err) {
        feather.logger.error({message:"Cannot update cache.  Error reading file " + name, category:"feather.respack", exception:err});
      } else {
        me.components[name].content = data;
        me.buildCacheContent();
      }
    });
  },
  dispose: function($super) {
    // Take us out of the cache repo.
    //feather.resourceCaches.remove(this);
    
    // Dispose of all of the components.
    for (var i = 0; i < this.componentOrder.length; i++) {
      var name = this.componentOrder[i];
      if (this.eventDispatcher) {
        this.eventDispatcher.removeListener("filechange:"+name, this.components[name].changeListener);
      }
    }
    this.components = null;
    this.componentOrder = null;
    this.content = null;
    this.id = null;
    
    // Super dispose.
    $super();
  }
};
module.exports = ResourceCache;