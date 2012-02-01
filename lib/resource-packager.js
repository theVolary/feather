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
    simpleId = require("./simple-id"),
    cleanCss = require("clean-css"),
    uglifyJs = require("uglify-js"),
    localPublisher = require("./local-resource-publisher");

/*
 * A local registry to manage cached resource groups
 */
var resourcePublishers = new Registry();
simpleCache.setItem("feather-resourcePublishers", resourcePublishers);

/**
 * A generic packager for arbitrary resource groups<br/>
 * NOTE: cacheName should include file extension, and all files in a group should be of the same file type
 * <pre class="code">{
 *    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
 *    cacheName: "foo.js", //duel purpose: 1) cache name on server, 2) resource uri on client for consolidated content resource
 *    files: [
 *      {path: "url/on/client.extension", prefix: "server/side/prefix/to/file"},
 *      ..
 *      {path: "url/on/client.extension", prefix: "server/side/prefix/to/file"}
 *    ]
 * }</pre>
 * @name resourcePackager.packageResources
 * @param {Object} options see example in description above.
 * @function 
 */
exports.packageResources = function(options, callback) {
  if (!options.files || !options.files.length) {
    callback("Cannot package resources; the files array is either empty or not present.");
  } else {
    simpleCache.getItem("feather-logger", function(err, logger) {
      var publisher = resourcePublishers.findById(options.cacheName),
        newCache = false,
        hrefPrefix = typeof options.hrefPrefix === "undefined" ? "/" : options.hrefPrefix,
        resourceOptions = options.appOptions.resources,
        $j = options.dom.$j,
        pkg = _.detect(resourceOptions.packages, function(pkg) { return pkg.name === options.cacheName; }),
        pkgOptions = _.clone(resourceOptions.publish);

      if (pkg) {
        pkgOptions = _.extend(pkgOptions, pkg);
      }
      var consolidate = pkgOptions.consolidate,
        minify = pkgOptions.minify,
        publisherOptions;

      if (pkgOptions.publisher) {
        publisherOptions = pkgOptions.publisher;
      } else if (pkgOptions.publisherId) {
        publisherOptions = _.detect(pkgOptions.publishers, function(pub) {
          return pub.id === pkgOptions.publisherId;
        });
      }

      if (!publisher) {
        newCache = true;
        //build a publisher object, use it, and stuff in cache
        publisher = new ResourcePublisher({
          cacheName: options.cacheName,
          contentType: options.contentType,
          publisherOptions: publisherOptions
        });
        publisher.publishers.add(localPublisher);
        resourcePublishers.add(publisher);
      }

      var publish = function(err, publishResult) {
        if (err) {
          //crash with data (including stack info)
          throw new Error("Error publishing: " + err);
        } else {
          var virtualFiles = _.select(options.files, function(file) {
            return file.virtual;
          });
          if (virtualFiles && virtualFiles.length) {
            _.each(virtualFiles, function(file) {
              $j.tmpl(options.template, {
                href: file.path
              }).appendTo($j('resources'));
            });
          }
          if (consolidate) {
            $j.tmpl(options.template, { href: publishResult.consolidatedUrl }).appendTo($j('resources'));
          } else {
            _.each(publishResult.files, function(file) {
              $j.tmpl(options.template, {
                href: file.url
              }).appendTo($j('resources'));
            });            
          }
        }
        callback(err);
      };

      if (newCache) {
        var sem = new Semaphore(function() {
          publisher.publish(publisherOptions, publish);
        });
        sem.semaphore = options.files.length;
        _.each(options.files, function(file, index){
          if (!file || !file.path || file.virtual) { //skip
            sem.execute();
          } else {
            var filePath = file.prefix+file.path,
              minifyAllowed = (!file.minifyAllowed || file.minifyAllowed === true); // if it's true or missing, minify is allowed.

            fs.readFile(filePath, "utf8", function(err, content) {        
              if (err) {
                logger.error({message:"file not found: " + filePath, immediately: true, category:"feather.respack"});
                sem.execute();
              } else {
                if (publisher.contentType === "text/css") {
                  if (consolidate) {
                    content = exports.resolveCssUrls(filePath, content);
                  }
                  if (minify) {
                    content = cleanCss.process(content);
                  }
                } else if (publisher.contentType === "text/javascript") {
                  // if (minify && minifyAllowed) {
                  //   content = minifyJs(file.path, content, pkgOptions.mangleJs);
                  // }
                }
                publisher.addComponent({
                  name: filePath,
                  url: file.path,
                  content: content,
                  index: index
                }, function(err) {
                  sem.execute();
                });
              }
            });
          }
        });
      } else {
        publisher.onceState("published", function(publishResult) {
          publish(null, publisher.publishResult);
        });
      }
    });
  }
};

/**
 * Specialized packager for framework files
 * @name resourcePackager.packageFrameworkResources
 * @param {Object} options
 */
exports.packageFrameworkResources = function(options, callback) {
  
  var prefix = options.appOptions.featherRoot;

  //TODO: this ultimately needs to change somehow to prevent cross-protocol serving of socket.io resources (IE9 complains)
  if (options.appOptions["socket.io"].enabled) {
    var socketProtocol = options.appOptions.ssl && options.appOptions.ssl.enabled ? "https" : "http";
    var socketPrefix = socketProtocol + "://" + options.appOptions["socket.io"].host + ":" + options.appOptions["socket.io"].port;
  }
  
  // js -----------------------------------------------------------------
  var jsFiles = [
    {path: "/feather-client/lib/underscore-min.js", prefix: prefix},
    options.appOptions["socket.io"].enabled ? {path: socketPrefix + "/socket.io/socket.io.js", prefix: prefix, virtual: true} : null,
    {path: "/feather-client/lib/json2.js", prefix: prefix, minifyAllowed: false},
    {path: "/feather-client/lib/jquery-1.7.min.js", prefix: prefix},
    {path: "/feather-client/lib/jquery.tmpl.js", prefix: prefix},
    {path: "/feather-client/lib/jquery.cookie.js", prefix: prefix},
    {path: "/feather-client/lib/inherits.js", prefix: prefix},
    {path: "/feather-client/feather.js", prefix: prefix},
    {path: "/feather-client/base-class.js", prefix: prefix},
    {path: "/feather-client/event-publisher.js", prefix: prefix},
    {path: "/feather-client/dom-event-cache.js", prefix: prefix},
    {path: "/feather-client/registry.js", prefix: prefix},
    {path: "/feather-client/semaphore.js", prefix: prefix},
    {path: "/feather-client/fsm.js", prefix: prefix},
    {path: "/feather-client/util.js", prefix: prefix},
    {path: "/feather-client/widget.js", prefix: prefix},
    {path: "/feather-client/socket.js", prefix: prefix}
  ];

  if (options.appOptions.rest && options.appOptions.rest.autoGenerateProxy && options.restProxyInfo) {
    //add the restProxy files
    jsFiles.push({path: "/feather-client/restProxy.js", prefix: prefix});
    jsFiles.push({
      path: options.restProxyInfo.path,
      prefix: options.restProxyInfo.prefix
    });
  }
  
  // Only add the auth scripts if this app has auth enabled.
  if (options.appOptions.auth.enabled) {
    //jsFiles.push({path: "feather-client/sha512.js", prefix: prefix});
    jsFiles.push({path: "/feather-client/auth-client.js", prefix: prefix});
  }
  
  // Add datalinking if enabled
  if (options.appOptions.data.datalinking.enabled) {
    jsFiles.push({path: "/feather-client/lib/jquery.datalink.js", prefix: prefix});
  }
  
  // Add files for the ui provider if enabled
  if (options.appOptions.ui.enabled) {
    var uiJSPrefix = prefix;
    if (options.appOptions.ui.provider.jsRoot === "/") uiJSPrefix = options.appOptions.publicRoot;
    _.each(options.appOptions.ui.provider.jsFiles, function(file) {
      jsFiles.push({path: file, prefix: uiJSPrefix});
    });
  }

  var jsOptions = _.extend(_.clone(options), {
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
    cacheName: "feather-client-core.js",
    hrefPrefix: "",
    contentType: "text/javascript",
    files: _.compact(jsFiles)
  });

  var frameworkPackaged = new Semaphore(callback);
  
  frameworkPackaged.increment();
  exports.packageResources(jsOptions, function(err) {
    frameworkPackaged.execute(err);
  });
  
  // css -----------------------------------------------------------------
  
  var cssFiles = [];
  
  // Add files for the ui provider if enabled
  if (options.appOptions.ui.enabled) {
    var uiCSSPrefix = prefix;
    if (options.appOptions.ui.provider.cssRoot === "/") uiCSSPrefix = options.appOptions.publicRoot;
    _.each(options.appOptions.ui.provider.cssFiles, function(file) {
      cssFiles.push({path: file, prefix: uiCSSPrefix});
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
  var widgetResourcesPackaged = new Semaphore(function(err) {
    callback(err);
  });

  widgetResourcesPackaged.increment();
  packageWidgetCss(options, function(err) {
    widgetResourcesPackaged.execute(err);
  });
  widgetResourcesPackaged.increment();
  packageWidgetJs(options, function(err) {
    widgetResourcesPackaged.execute(err);
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
  exports.packageResources(packageInfo, callback, true);
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
// function minifyJs(name, content, mangleJs) {
//   if (name.match(/min.js$|feather-client\/lib\/json2.js$/)) {
//     return content;
//   }
//   var ast;
//   try {
//     ast = uglifyJs.parser.parse(content, true);
//   } catch( err ) {
//     console.warn("JS minifier for " + name + " failed strict test.  Minified JS may have errors in it.");
//   }

//   if (!ast) {
//     ast = uglifyJs.parser.parse(content);
//   }
//   if (mangleJs) {
//     ast = uglifyJs.uglify.ast_mangle(ast);
//   }
//   ast = uglifyJs.uglify.ast_squeeze(ast);
//   return uglifyJs.uglify.gen_code(ast);
// }