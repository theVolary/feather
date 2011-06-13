var util = require("util"),
    fs  = require("fs"),
    path = require("path"),
    _ = require("underscore")._,
    inherits = require("inherits"),
    BaseClass = require("./base-class"),
    Registry = require("./registry"),
    Semaphore = require("./semaphore"),
    ResourcePublisher = require("./resource-publisher"),
    simpleCache = require("./simple-cache"),
    cleanCss = require("clean-css"),
    uglifyJs = require("uglify-js"),
    localPublisher = require("./local-resource-publisher");

/**
 * A local registry to manage cached resource groups
 */
var resourcePublishers = new Registry();
var publisherInstances = new Registry();
publisherInstances.add(localPublisher);
simpleCache.setItem("feather-resourcePublishers", resourcePublishers);

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
exports.packageResources = function(options, callback) {
  simpleCache.getItem("feather-logger", function(err, logger) {
    logger.debug({message:"Packaging " + options.cacheName, category:"feather.respack", immediately:true});
    var cache = resourcePublishers.findById(options.cacheName);
    var newCache = false;
    var hrefPrefix = typeof options.hrefPrefix === "undefined" ? "/" : options.hrefPrefix;
    var resourceOptions = options.appOptions.resources;
    var $j = options.dom.$j;
    var pkg = _.detect(resourceOptions.packages, function(pkg) { return pkg.name === options.cacheName; });
    var pkgOptions = _.clone(resourceOptions.publish);
    if (pkg) {
      pkgOptions = _.extend(pkgOptions, pkg);
    }
    var consolidate = pkgOptions.consolidate;
    var minify = pkgOptions.minify;

    if (consolidate) {
      logger.trace({message:"Consolidating " + options.cacheName, category:"feather.respack", immediately:true});
    } else {
      logger.trace({message:"Not consolidating " + options.cacheName, category:"feather.respack", immediately:true});
    }

    if (!cache) {
      newCache = true;
      logger.debug({message:"Building cache " + options.cacheName, category:"feather.respack", immediately:true});
      //build a cache object, use it, and stuff in cache
      cache = new ResourcePublisher({
        cacheName: options.cacheName,
        contentType: options.contentType
      });
      if (consolidate) {
        cache.publishers.add(localPublisher);
      }
      resourcePublishers.add(cache);

    }

    logger.debug({message:"============== Cache " + cache.id + " consolidate is " + consolidate + "; newCache is " + newCache, category:"feather.respack", immediately:true});

    var publisherOptions;
    if (pkgOptions.publisher) {
      publisherOptions = pkgOptions.publisher;
    } else if (pkgOptions.publisherId) {
      publisherOptions = _.detect(pkgOptions.publishers, function(pub) {
        return pub.id === pkgOptions.publisherId;
      });
    }

    function whenAllComponentsAdded() {
      logger.debug({message:"Publishing " + cache.id, category:"feather.respack", immediately:true});
      cache.publish(publisherOptions, function(err) {
        if (err) {
          logger.error({message:"Error publishing", category:"feather.respack", exception:err});
        }

        //logger.debug({message:"Finished publishing " + cache.id, category:"feather.respack", immediately:true});
        callback(err);
      });
    }

    var sem = new Semaphore(whenAllComponentsAdded);

    if (!consolidate || newCache) {
      sem.semaphore = options.files.length;
      _.each(options.files, function(file, index){
        var filePath = file.prefix+file.path;
        if (newCache) {
          fs.readFile(filePath, "utf8", function(err, content) {
          
            if (err) {
              logger.error({message:"file not found: " + filePath, immediately: true, category:"feather.respack"});
              sem.execute();
            } else {
              if (cache.contentType === "text/css") {
                if (consolidate) {
                  content = exports.resolveCssUrls(filePath, content);
                }
                if (minify) {
                  content = cleanCss.process(content);
                }
              } else if(cache.contentType === "text/javascript") {
                if (minify) {
                  content = minifyJs(content, pkgOptions.mangleJs);
                }
              }
              cache.addComponent(filePath, content, index, function(err) {
                sem.execute();
              });
            }
          });
        } else {

          sem.execute();
        }
        if (!consolidate) {
          $j.tmpl(options.template, {
            href: hrefPrefix + file.path
          }).appendTo($j('resources'));
        }
        //logger.trace({message:"cached file path " + filePath, category: "feather.respack", immediately:true });
      });
      if (consolidate) {
        if (publisherOptions) {
          var baseUrl = publisherOptions.config.publishLocation;
          if (baseUrl[0] !== "/") baseUrl = "/" + baseUrl;
          //var batchHrefPrefix = typeof options.batchHrefPrefix === "undefined" ? "/featherresource/" : options.batchHrefPrefix;
          $j.tmpl(options.template, { href: baseUrl + "/" + options.cacheName }).appendTo($j('resources'));
        }
      }  
    } else {
      debugger;
      (!newCache) && logger.debug({message:"Finished packaging existing cache " + cache.id, category:"feather.respack"});
      whenAllComponentsAdded();
    }
  });
};

/**
 * Specialized packager for framework files
 * @name resourcePackager.packageFrameworkResources
 * @param {Object} options
 */
exports.packageFrameworkResources = function(options, callback) {
  
  var prefix = options.appOptions.featherRoot + "/";
  
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
  if (options.appOptions.auth.enabled) {
    jsFiles.push({path: "feather-client/sha512.js", prefix: prefix});
    jsFiles.push({path: "feather-client/auth-client.js", prefix: prefix});
  }
  
  // Add datalinking if enabled
  if (options.appOptions.data.datalinking.enabled) {
    jsFiles.push({path: "feather-client/lib/jquery.datalink.js", prefix: prefix});
  }
  
  // Add files for the ui provider if enabled
  if (options.appOptions.ui.enabled) {
    _.each(options.appOptions.ui.provider.jsFiles, function(file) {
      jsFiles.push({path: file, prefix: prefix});
    });
  }

  var jsOptions = _.extend(_.clone(options), {
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
    cacheName: "feather-client-core.js",
    contentType: "text/javascript",
    files: jsFiles
  });

  var frameworkPackaged = new Semaphore(function(err) {
    callback(err);
  });
  
  frameworkPackaged.increment();

  exports.packageResources(jsOptions, function(err) {
    frameworkPackaged.execute();
  });
  
  // css -----------------------------------------------------------------
  
  var cssFiles = [];
  
  // Add files for the ui provider if enabled
  if (options.appOptions.ui.enabled) {
    _.each(options.appOptions.ui.provider.cssFiles, function(file) {
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

    frameworkPackaged.increment();
    exports.packageResources(cssOptions, function(err) {
      frameworkPackaged.execute(err);
    });
  }
};

/**
 * Specialized packager for widget level resources
 * @name resourcePackager.packageWidgetResources
 * @param {Object} options
 */
exports.packageWidgetResources = function(options, callback) {
  var widgetResourcesPackaged = new Semaphore( function() {
    callback();
  });

  widgetResourcesPackaged.increment();
  packageWidgetCss(options, function() {
    widgetResourcesPackaged.execute();
  });
  widgetResourcesPackaged.increment();
  packageWidgetJs(options, function() {
    widgetResourcesPackaged.execute();
  });
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
  
  // TODO: Make sure http urls work.
  var urlRegex = /url\((["']?)([^\/|^"\/|^'\/].+)(["']?)\)/g
  if (filePath.indexOf("jquery-ui-1.8.12.custom.css") > 0) {
    debugger;
  }
  var dir = path.dirname(filePath);
  var frameworkIndex = dir.indexOf("/feather-client/");
  var startIndex = frameworkIndex < 0 ? dir.indexOf("public/") + 6 : frameworkIndex;
  dir = dir.substring(startIndex); // Now of the form /widgets/mywidget or /feather-client/
  return content.replace(urlRegex, function(match, prefix, cssUrl /*, m3, m4 (etc), offset, str */) {
    return path.normalize('url('+ prefix + dir + "/" + cssUrl + ')');
  });
};

function packageWidgetJs(options, callback) {
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
      prefix: options.appOptions.publicRoot
    });
  });
  exports.packageResources(packageInfo, callback);
}

function packageWidgetCss(options, callback) {
  
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
      prefix: options.appOptions.publicRoot
    });
  });
  exports.packageResources(packageInfo, callback);
}

/**
 * Function to minify js content.  Set in its own function to make it easier 
 * to swap out minifier implementations.
 */
function minifyJs(content, mangleJs) {
  var ast = uglifyJs.parser.parse(content);
  if (mangleJs) {
    ast = uglifyJs.uglify.ast_mangle(ast);
  }
  ast = uglifyJs.uglify.ast_squeeze(ast);
  return uglifyJs.uglify.gen_code(ast);
}