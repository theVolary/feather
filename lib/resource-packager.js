var util = require("util"),
    fs  = require("fs"),
    path = require("path"),
    _ = require("underscore")._,
    inherits = require("inherits"),
    BaseClass = require("./base-class"),
    Registry = require("./registry"),
    ResourceCache = require("./resource-cache"),
    simpleCache = require("./simple-cache"),
    cleanCss = require("clean-css"),
    uglifyJs = require("uglify-js");

/**
 * A local registry to manage cached resource groups
 */
var resourceCaches = new Registry();
simpleCache.setItem("resourceCaches", resourceCaches);

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
  var cache = resourceCaches.findById(options.cacheName);
  var newCache = false;
  var hrefPrefix = typeof options.hrefPrefix === "undefined" ? "/" : options.hrefPrefix;
  var resourceOptions = options.resources;
  var pkg         = _.detect(resourceOptions.packages, function(pkg) { return pkg.name === cache.id; });
  var consolidate = resourceOptions.consolidation.consolidateAll || (pkg && pkg.consolidate);
  var consolidationOptions = _.clone(resourceOptions.consolidation);
  consolidationOptions.enabled = consolidate;
  consolidationOptions.serveStatic.path = path.normalize(options.publicRoot + consolidationOptions.serveStatic.urlPrefix);
  var $j = options.dom.$j;
  if (!cache) {
    newCache = true;
//    feather.logger.debug({message:"Building cache " + options.cacheName, category:"feather.respack"});
    //build a cache object, use it, and stuff in cache
    cache = new ResourceCache({
      cacheName: options.cacheName,
      consolidation: consolidationOptions,
      contentType: options.contentType
    });
    resourceCaches.add(cache);
  }
  var minifyType  = cache.contentType.split("/")[1];
  minifyType = "minify" + minifyType.charAt(0).toUpperCase() + minifyType.slice(1);
  var minify      = resourceOptions.minifyAll || resourceOptions[minifyType] || (pkg && pkg.minify);
  if (!consolidate || newCache) {
    var filePath;
    options.files.each(function(file){
      filePath = file.prefix+file.path;
      if (newCache) {
        try {
          var content = fs.readFileSync(filePath, "utf8");
          
          if (options.contentType === "text/css") {
            if (consolidate) {
              content = exports.resolveCssUrls(filePath, content);
            }
            if (minify) {
              content = cleanCss.process(context);
            }
          } else if(options.contentType === "text/javascript") {
            if (minify) {
              content = minifyJs(content, pkg, resourceOptions);
            }
          }
          
          cache.addComponent(filePath, content);
        } catch (ex) {
//          feather.logger.error("file not found: " + file.prefix + file.path);
        }
      }
      if (!consolidate) {
//        feather.logger.trace({message:"Not consolidating " + cache.id, category:"feather.respack"});
        $j.tmpl(options.template, {
          href: hrefPrefix + file.path
        }).appendTo($j('resources'));
      }
      var cacheId = options.cacheName.valueOf();
//      feather.logger.trace({message:"cached file path " + filePath, category: "feather.respack" });
      
    });
  }
  if (consolidate) {
//    feather.logger.trace({message:"Consolidating " + cache.id, category:"feather.respack"});
    var batchHrefPrefix = typeof options.batchHrefPrefix === "undefined" ? "/featherresource/" : options.batchHrefPrefix;
    if (resourceOptions.consolidation.serveStatic.enabled) {
      batchHrefPrefix = resourceOptions.consolidation.serveStatic.urlPrefix;
    }
    $j.tmpl(options.template, { href: batchHrefPrefix + "/" + options.cacheName }).appendTo($j('resources'));
  }
};

/**
 * Specialized packager for framework files
 * @name resourcePackager.packageFrameworkResources
 * @param {Object} options
 */
exports.packageFrameworkResources = function(options) {
  
  var prefix = options.featherRoot + "/";
  
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
  if (options.auth.enabled) {
    jsFiles.push({path: "feather-client/sha512.js", prefix: prefix});
    jsFiles.push({path: "feather-client/auth-client.js", prefix: prefix});
  }
  
  // Add datalinking if enabled
  if (options.data.datalinking.enabled) {
    jsFiles.push({path: "feather-client/lib/jquery.datalink.js", prefix: prefix});
  }
  
  // Add files for the ui provider if enabled
  if (options.ui.enabled) {
    options.ui.provider.jsFiles.each(function(file) {
      jsFiles.push({path: file, prefix: prefix});
    });
  }

  var jsOptions = _.extend(_.clone(options), {
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
    cacheName: "feather-client-core.js",
    contentType: "text/javascript",
    files: jsFiles
  });

  
  exports.packageResources(jsOptions);
  
  // css -----------------------------------------------------------------
  
  var cssFiles = [];
  
  // Add files for the ui provider if enabled
  if (options.ui.enabled) {
    options.ui.provider.cssFiles.each(function(file) {
      cssFiles.push({path: file, prefix: prefix});
    });
  }
  
  if (cssFiles.length) {

    var cssOptions = _.extend(_.clone(options), {
      template: '<link rel="stylesheet" type="text/css" href="${href}" />',
      cacheName: "feather-client-core.css",
      contentType: "text/css",
      files: cssFiles
    });

    exports.packageResources(cssOptions);
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

/**
 *  Test data used on www.regexpal.com
 *
 * url(/fonts/somefile.ttf);
 * url('/img/f.gif');
 * url("/js/script.js");
 * url("../images/myimg.png");
 * url('../res/something.png');
 * url(../fonts/anotherfont.otf);
 * url(i.jpg);
 */
exports.resolveCssUrls = function (filePath, content) {
  
  var urlRegex = /url\((["']?)([^\/|^"\/|^'\/].+)(["']?)\)/g
  var dir = path.dirname(filePath);
  dir = dir.substring(dir.indexOf("public/")+6); // Now of the form /widgets/mywidget
  return content.replace(urlRegex, function(match, prefix, cssUrl /*, m3, m4 (etc), offset, str */) {
    return path.normalize('url('+ prefix + dir + "/" + cssUrl + ')');
  });
};

function packageWidgetJs(options) {
  
  var packageInfo = _.extend(_.clone(options), {
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
    cacheName: options.request.page + ".js",
    hrefPrefix: "",
    contentType: "text/javascript",
    files: []
  });
  options.widgetClassRegistry.each(function(widgetClass) {
    packageInfo.files.push({
      path: widgetClass.clientHrefPath,
      prefix: options.publicRoot
    });
  });
  exports.packageResources(packageInfo);
}

function packageWidgetCss(options) {
  
  var packageInfo = _.extend(_.clone(options), {
    template: '<link rel="stylesheet" type="text/css" href="${href}" />',
    cacheName: options.request.page + ".css",
    hrefPrefix: "",
    contentType: "text/css",
    files: []
  });

  options.widgetClassRegistry.each(function(widgetClass) {
    packageInfo.files.push({
      path: widgetClass.clientCssHrefPath,
      prefix: options.publicRoot
    });
  });
  exports.packageResources(packageInfo);
}

/**
 * Function to minify js content.  Set in its own function to make it easier 
 * to swap out minifier implementations.
 */
function minifyJs(content, package, options) {
  var ast = uglifyJs.parser.parse(content);
  if (options.mangleAllJs || (package && package.mangle)) {
    ast = uglifyJs.uglify.ast_mangle(ast);
  }
  ast = uglifyJs.uglify.ast_squeeze(ast);
  return uglifyJs.gen_code(ast);
}