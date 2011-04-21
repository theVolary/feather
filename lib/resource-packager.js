var sys = require("sys"),
    fs  = require("fs");
    
/**
 * @namespace 
 * @name resourcePackager
 */
    
/*
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
feather.resourceCaches = new feather.lang.registry();

/*
 * Class for resource caches
 */
var resourceCache = Class.create( {
  initialize: function(options) {
    this.id = options.cacheName;
    this.contentType = options.contentType;
    this.content = "";
    feather.resourceCaches.add(this);
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
    //build a cache object, use it, and stuff in cache
    cache = new resourceCache({
      cacheName: options.cacheName,
      contentType: options.contentType
    });
  }
  if (options.debug || newCache) {
    options.files.each(function(file){
      if (newCache) {
        try {
          var content = fs.readFileSync(file.prefix + file.path, "utf8");
          cache.content += content;
        } catch (ex) {
          feather.logger.error("file not found: " + file.prefix + file.path);
        }
      }
      if (options.debug) {
        $j.tmpl(options.template, {
          href: hrefPrefix + file.path
        }).appendTo($j('resources'));
      }
    });
  }
  if (!options.debug) {
    var batchHrefPrefix = typeof options.batchHrefPrefix === "undefined" ? "/featherresource/" : options.batchHrefPrefix;
    $j.tmpl(options.template, { href: hrefPrefix + options.cacheName }).appendTo($j('resources'));
  }
};

/**
 * Specialized packager for framework files
 * @name resourcePackager.packageFrameworkResources
 * @param {Object} options
 */
exports.packageFrameworkResources = function(options) {
  
  var fileArray = [
    {path: "feather-client/lib/json2.js", prefix: feather.appOptions.featherRoot},
    {path: "feather-client/lib/jquery-1.4.2.js", prefix: feather.appOptions.featherRoot},
    {path: "feather-client/lib/jquery.tmpl.js", prefix: feather.appOptions.featherRoot},
    {path: "feather-client/lib/jquery.cookie.js", prefix: feather.appOptions.featherRoot},
    {path: "feather-client/core.js", prefix: feather.appOptions.featherRoot},
    {path: "feather-client/lang.js", prefix: feather.appOptions.featherRoot},
    {path: "feather-client/event.js", prefix: feather.appOptions.featherRoot},
    {path: "feather-client/fsm.js", prefix: feather.appOptions.featherRoot},
    {path: "feather-client/util.js", prefix: feather.appOptions.featherRoot},
    {path: "feather-client/widget.js", prefix: feather.appOptions.featherRoot},
    {path: "socket.io.client/socket.io.js", prefix: feather.appOptions.featherRoot},
    {path: "feather-client/socket.js", prefix: feather.appOptions.featherRoot}
  ];
  
  // Only add the auth scripts if this app has auth enabled.
  if (feather.appOptions.auth.enabled) {
    fileArray.push({path: "feather-client/sha512.js", prefix: feather.appOptions.featherRoot});
    fileArray.push({path: "feather-client/auth-client.js", prefix: feather.appOptions.featherRoot});
  }
  
  exports.packageResources({
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
    cacheName: "feather-client-core.js",
    contentType: "text/javascript",
    debug: options.debug,
    files: fileArray,
    dom: options.dom
  });
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
    cacheName: "featherjs/" + options.request.page + ".js",
    hrefPrefix: "",
    batchHrefPrefix: "/",
    contentType: "text/javascript",
    debug: options.debug,
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
    cacheName: "feathercss/" + options.request.page + ".css",
    hrefPrefix: "",
    batchHrefPrefix: "/",
    contentType: "text/css",
    debug: options.debug,
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