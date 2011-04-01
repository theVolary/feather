var sys = require("sys"),
    fs  = require("fs");
    
/**
 * Respond with 404 "Not Found".
 */
function notFound(res) {
  var body = 'Not Found';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', body.length);
  res.statusCode = 404;
  res.end(body);
}  

/**
 * A local registry to manage cached resource groups
 */
jojo.resourceCaches = new jojo.lang.registry();

/**
 * Class for resource caches
 */
var resourceCache = Class.create({
  initialize: function(options) {
    this.id = options.cacheName;
    this.contentType = options.contentType;
    this.content = "";
    jojo.resourceCaches.add(this);
  },
  serveContent: function(res) {
    if (this.content == "") {
      return notFound(res);
    }
    res.setHeader('Content-Type', this.contentType);
    res.setHeader('Content-Length', this.content.length);
    res.statusCode = 200;
    res.end(this.content);
  }
});

/**
 * A generic packager for arbitrary resource groups
 * NOTE: cacheName should include file extension, and all files in a group should be of the same file type
 * @param {Object} options
 * {
 *    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
 *    cacheName: "foo.js", //duel purpose: 1) cache name on server, 2) resource uri on client when not in debug mode
 *    files: [
 *      {path: "url/on/client.extension", prefix: "server/side/prefix/to/file"},
 *      ..
 *      {path: "url/on/client.extension", prefix: "server/side/prefix/to/file"}
 *    ]
 * }
 */
exports.packageResources = function(options) {
  var cache = jojo.resourceCaches.findById(options.cacheName);
  var newCache = false;
  if (!cache) {
    newCache = true;
    //build a cache object, use it, and stuff in cache
    cache = new resourceCache({
      cacheName: options.cacheName,
      contentType: options.contentType
    });
  }
  if (options.debug || newCache) {
    options.files.each(function(file){
      if (newCache) {
        var content = fs.readFileSync(file.prefix + file.path, "utf8");
        cache.content += content;
      }
      if (options.debug) {
        $j.tmpl(options.template, {
          href: "/" + file.path
        }).appendTo($j('resources'));
      }
    });
  }
  if (!options.debug) {
    $j.tmpl(options.template, { href: "/jojoresource/" + options.cacheName }).appendTo($j('resources'));
  }
};

/**
 * Specialized packager for widget level resources
 * @param {Object} options
 */
exports.packageWidgetResources = function(options) {
  packageWidgetCss(options);
  packageWidgetJs(options);
};

function packageWidgetJs(options) {
  
  exports.packageResources({
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
    cacheName: "jojojs-client-core.js",
    contentType: "text/javascript",
    debug: options.debug,
    files: [
      {path: "jojojs-client/lib/json2.js", prefix: jojo.appOptions.jojoRoot},
      {path: "jojojs-client/lib/jquery-1.4.2.js", prefix: jojo.appOptions.jojoRoot},
      {path: "jojojs-client/lib/jquery.tmpl.js", prefix: jojo.appOptions.jojoRoot},
      {path: "jojojs-client/lib/jquery.cookie.js", prefix: jojo.appOptions.jojoRoot},
      {path: "jojojs-client/core.js", prefix: jojo.appOptions.jojoRoot},
      {path: "jojojs-client/lang.js", prefix: jojo.appOptions.jojoRoot},
      {path: "jojojs-client/event.js", prefix: jojo.appOptions.jojoRoot},
      {path: "jojojs-client/fsm.js", prefix: jojo.appOptions.jojoRoot},
      {path: "jojojs-client/widget.js", prefix: jojo.appOptions.jojoRoot},
      {path: "socket.io.client/socket.io.js", prefix: jojo.appOptions.jojoRoot},
      {path: "jojojs-client/socket.js", prefix: jojo.appOptions.jojoRoot}
    ]
  });
  
  packageWidgetResource({
    resourceType: 'js',
    resourcePathExt: '.client.js',
    resourceCache: jojo.widgetClientFiles,
    debug: options.debug,
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
  });
}

function packageWidgetCss(options) {
  
  packageWidgetResource({
    resourceType: 'css',
    resourcePathExt: '.css',
    resourceCache: jojo.cssFiles,
    debug: options.debug,
    template: '<link rel="stylesheet" type="text/css" href="${href}" />'
  });
}

function packageWidgetResource(options) {
  var resourceTracker = {};
  var buffer = "";
  var aggregatedHref = "/jojo" + options.resourceType + "/";
  
  jojo.widget.loadedClasses.each(function(widgetClass) {
    
    if (! resourceTracker[widgetClass.id]) {
      
      var clientResourcePath = widgetClass.id + widgetClass.widgetName + options.resourcePathExt;
      var fsResourcePath = widgetClass.fsWidgetPath + options.resourcePathExt;
      var resourceExists = options.resourceCache[fsResourcePath];
      
      if (resourceExists) {
       
        resourceTracker[widgetClass.id] = true;
        
        if (options.debug) {
          
          $j.tmpl(options.template, { href: clientResourcePath }).appendTo($j('head'));
          
        } else {
          
          buffer += "\n/* === BEGIN " + widgetClass.widgetName + " === " + " */\n";
          buffer += fs.readFileSync(fsResourcePath, "utf8");
          buffer += "\n/* === END " + widgetClass.widgetName + " === " + " */\n";
          
        }
      } // end if resource exists
      
    } // end if widget not already processed.
  });
  
  if (! options.debug) {
    
    var cacheKey = jojo.request.page + options.resourcePathExt;
    options.resourceCache[cacheKey] = { body : buffer };
    aggregatedHref += cacheKey;
    $j.tmpl(options.template, { href : aggregatedHref }).appendTo($j('head'));
  }
}