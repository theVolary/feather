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
          jojo.logger.error("file not found: " + file.prefix + file.path);
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
    var batchHrefPrefix = typeof options.batchHrefPrefix === "undefined" ? "/jojoresource/" : options.batchHrefPrefix;
    $j.tmpl(options.template, { href: hrefPrefix + options.cacheName }).appendTo($j('resources'));
  }
};

/**
 * Specialized packager for framework files
 * @param {Object} options
 */
exports.packageFrameworkResources = function(options) {
  
  var fileArray = [
    {path: "jojojs-client/lib/json2.js", prefix: jojo.appOptions.jojoRoot},
    {path: "jojojs-client/lib/jquery-1.4.2.js", prefix: jojo.appOptions.jojoRoot},
    {path: "jojojs-client/lib/jquery.tmpl.js", prefix: jojo.appOptions.jojoRoot},
    {path: "jojojs-client/lib/jquery.cookie.js", prefix: jojo.appOptions.jojoRoot},
    {path: "jojojs-client/core.js", prefix: jojo.appOptions.jojoRoot},
    {path: "jojojs-client/lang.js", prefix: jojo.appOptions.jojoRoot},
    {path: "jojojs-client/event.js", prefix: jojo.appOptions.jojoRoot},
    {path: "jojojs-client/fsm.js", prefix: jojo.appOptions.jojoRoot},
    {path: "jojojs-client/util.js", prefix: jojo.appOptions.jojoRoot},
    {path: "jojojs-client/widget.js", prefix: jojo.appOptions.jojoRoot},
    {path: "socket.io.client/socket.io.js", prefix: jojo.appOptions.jojoRoot},
    {path: "jojojs-client/socket.js", prefix: jojo.appOptions.jojoRoot}
  ];
  
  // Only add the auth scripts if this app has auth enabled.
  if (jojo.appOptions.auth.enabled) {
    fileArray.push({path: "jojojs-client/sha512.js", prefix: jojo.appOptions.jojoRoot});
    fileArray.push({path: "jojojs-client/auth-client.js", prefix: jojo.appOptions.jojoRoot});
  }
  
  exports.packageResources({
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
    cacheName: "jojojs-client-core.js",
    contentType: "text/javascript",
    debug: options.debug,
    files: fileArray,
    dom: options.dom
  });
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
  
  var packageInfo = {
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
    cacheName: "jojojs/" + jojo.request.page + ".js",
    hrefPrefix: "",
    batchHrefPrefix: "/",
    contentType: "text/javascript",
    debug: options.debug,
    dom: options.dom,
    files: []
  };
  options.registry.each(function(widgetClass) {
    packageInfo.files.push({
      path: widgetClass.clientHrefPath,
      prefix: jojo.appOptions.publicRoot
    });
  });
  exports.packageResources(packageInfo);
}

function packageWidgetCss(options, registry) {
  
  var packageInfo = {
    template: '<link rel="stylesheet" type="text/css" href="${href}" />',
    cacheName: "jojocss/" + jojo.request.page + ".css",
    hrefPrefix: "",
    batchHrefPrefix: "/",
    contentType: "text/css",
    debug: options.debug,
    dom: options.dom,
    files: []
  };
  options.registry.each(function(widgetClass) {
    packageInfo.files.push({
      path: widgetClass.clientCssHrefPath,
      prefix: jojo.appOptions.publicRoot
    });
  });
  exports.packageResources(packageInfo);
}