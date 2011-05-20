var util = require("util"),
    fs  = require("fs"),
    path = require("path");
    
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

/**
 * A local registry to manage cached resource groups
 */
feather.resourceCaches = new feather.lang.registry();



/*
 * Class for resource caches
 */
var resourceCache = Class.create( {
  initialize: function(options) {
    this.id = options.cacheName;
    this.contentType = options.contentType;
    this.content = "";
    this.components = {};
    this.componentOrder = [];
    this.valid = false;
    feather.resourceCaches.add(this);
  },
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
    feather.event.eventDispatcher.on("filechange:" + name, component.changeListener);
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
    feather.resourceCaches.remove(this);
    
    // Dispose of all of the components.
    for (var i = 0; i < this.componentOrder.length; i++) {
      var name = this.componentOrder[i];
      feather.event.eventDispatcher.removeListener("filechange:"+name, this.components[name].changeListener);
    }
    this.components = null;
    this.componentOrder = null;
    this.content = null;
    this.id = null;
    
    // Super dispose.
    $super();
  }
});

/**
 * A generic packager for arbitrary resource groups<br/>
 * NOTE: cacheName should include file extension, and all files in a group should be of the same file type
 * <pre class="code">{
 *    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
 *    cacheName: "foo.js", //duel purpose: 1) cache name on server, 2) resource uri on client when not in debug mode
 *    files: [
 *      {path: "url/on/client.extension", prefix: "server/side/prefix/to/file"},
 *      ..
 *      {path: "url/on/client.extension", prefix: "server/side/prefix/to/file"}
 *    ]
 * }</pre>
 * @name resourcePackager.packageResources
 * @param {Object} options see example in description above. 
 */
exports.packageResources = function(options) {
  var cache = feather.resourceCaches.findById(options.cacheName);
  var newCache = false;
  var hrefPrefix = typeof options.hrefPrefix === "undefined" ? "/" : options.hrefPrefix;
  var $j = options.dom.$j;
  if (!cache) {
    newCache = true;
    feather.logger.debug({message:"Building cache " + options.cacheName, category:"feather.respack"});
    //build a cache object, use it, and stuff in cache
    cache = new resourceCache({
      cacheName: options.cacheName,
      contentType: options.contentType
    });
  }
  var resourceOptions = feather.appOptions.resources;
  var pkg = resourceOptions.packages.find(function(pkg) { return pkg.name === cache.id; });
  var consolidate = resourceOptions.consolidateAll || (pkg && pkg.consolidate);
  if (!consolidate || newCache) {
    var filePath;
    options.files.each(function(file){
      filePath = file.prefix+file.path;
      if (newCache) {
        try {
          var content = fs.readFileSync(filePath, "utf8");
          cache.addComponent(filePath, content);
        } catch (ex) {
          feather.logger.error("file not found: " + file.prefix + file.path);
        }
      }
      if (!consolidate) {
        feather.logger.trace({message:"Not consolidating " + cache.id, category:"feather.respack"});
        $j.tmpl(options.template, {
          href: hrefPrefix + file.path
        }).appendTo($j('resources'));
      }
      var cacheId = options.cacheName.valueOf();
      feather.logger.trace({message:"cached file path " + filePath, category: "feather.respack" });
      
    });
  }
  if (consolidate) {
    feather.logger.trace({message:"Consolidating " + cache.id, category:"feather.respack"});
    var batchHrefPrefix = typeof options.batchHrefPrefix === "undefined" ? "/featherresource/" : options.batchHrefPrefix;
    $j.tmpl(options.template, { href: batchHrefPrefix + options.cacheName }).appendTo($j('resources'));
  }
};

/**
 * Specialized packager for framework files
 * @name resourcePackager.packageFrameworkResources
 * @param {Object} options
 */
exports.packageFrameworkResources = function(options) {
  
  var prefix = feather.appOptions.featherRoot + "/";
  
  // js -----------------------------------------------------------------
  var jsFiles = [
    {path: "feather-client/lib/underscore-min.js", prefix: prefix},
    {path: "feather-client/lib/json2.js", prefix: prefix},
    {path: "feather-client/lib/jquery-1.6.js", prefix: prefix},
    {path: "feather-client/lib/jquery.tmpl.js", prefix: prefix},
    {path: "feather-client/lib/jquery.cookie.js", prefix: prefix},
    {path: "feather-client/core.js", prefix: prefix},
    {path: "feather-client/lang.js", prefix: prefix},
    {path: "feather-client/event.js", prefix: prefix},
    {path: "feather-client/fsm.js", prefix: prefix},
    {path: "feather-client/util.js", prefix: prefix},
    {path: "feather-client/widget.js", prefix: prefix},
    {path: "socket.io.client/socket.io.js", prefix: prefix},
    {path: "feather-client/socket.js", prefix: prefix}
  ];
  
  // Only add the auth scripts if this app has auth enabled.
  if (feather.appOptions.auth.enabled) {
    jsFiles.push({path: "feather-client/sha512.js", prefix: prefix});
    jsFiles.push({path: "feather-client/auth-client.js", prefix: prefix});
  }
  
  // Add datalinking if enabled
  if (feather.appOptions.data.datalinking.enabled) {
    jsFiles.push({path: "feather-client/lib/jquery.datalink.js", prefix: prefix});
  }
  
  // Add files for the ui provider if enabled
  if (feather.appOptions.ui.enabled) {
    feather.appOptions.ui.provider.jsFiles.each(function(file) {
      jsFiles.push({path: file, prefix: prefix});
    });
  }
  
  exports.packageResources({
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
    cacheName: "feather-client-core.js",
    contentType: "text/javascript",
    files: jsFiles,
    dom: options.dom
  });
  
  // css -----------------------------------------------------------------
  
  var cssFiles = [];
  
  // Add files for the ui provider if enabled
  if (feather.appOptions.ui.enabled) {
    feather.appOptions.ui.provider.cssFiles.each(function(file) {
      cssFiles.push({path: file, prefix: prefix});
    });
  }
  
  if (cssFiles.length) {
    exports.packageResources({
      template: '<link rel="stylesheet" type="text/css" href="${href}" />',
      cacheName: "feather-client-core.css",
      contentType: "text/css",
      files: cssFiles,
      dom: options.dom
    });
  }
};

/**
 * Specialized packager for widget level resources
 * @name resourcePackager.packageWidgetResources
 * @param {Object} options
 */
exports.packageWidgetResources = function(options) {
  packageWidgetCss(options);
  packageWidgetJs(options);
};

function packageWidgetJs(options) {
  
  var packageInfo = {
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
    cacheName: options.request.page + ".js",
    hrefPrefix: "",
    contentType: "text/javascript",
    dom: options.dom,
    files: []
  };
  options.widgetClassRegistry.each(function(widgetClass) {
    packageInfo.files.push({
      path: widgetClass.clientHrefPath,
      prefix: feather.appOptions.publicRoot
    });
  });
  exports.packageResources(packageInfo);
}

function packageWidgetCss(options) {
  
  var packageInfo = {
    template: '<link rel="stylesheet" type="text/css" href="${href}" />',
    cacheName: options.request.page + ".css",
    hrefPrefix: "",
    contentType: "text/css",
    dom: options.dom,
    files: []
  };
  options.widgetClassRegistry.each(function(widgetClass) {
    packageInfo.files.push({
      path: widgetClass.clientCssHrefPath,
      prefix: feather.appOptions.publicRoot
    });
  });
  exports.packageResources(packageInfo);
}