var MarkdownCache = exports.MarkdownCache = function(feather, cacheLifetime) {
  this.feather = feather;
  this.cacheLifetime = cacheLifetime || 3600000;
  this.registry = new feather.lang.Registry();
};

MarkdownCache.prototype = {
  cacheLifetime: 3600000, // one hour in ms
  add: function(url, doc) {
    var cachedDoc = this.registry.findById(url);
    if (cachedDoc) {
      this.registry.remove({id:url});
    }
    this.registry.add({id:url, body:doc, expires: new Date().getTime()+this.cacheLifetime});
  },
  get: function(url) {
    var cachedDoc = this.registry.findById(url);
    if (cachedDoc) {
      if (cachedDoc.expires - new Date().getTime() > 0) {
        return cachedDoc.body;
      } else {
        this.registry.remove({id:url});
        return null;
      }
    } else {
      return null;
    }
  }
};