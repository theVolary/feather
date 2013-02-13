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
    localPublisher = require("./local-resource-publisher"),
    s3Publisher = require("./s3-resource-publisher"),
    console = require('console');

/*
 * A local registry to manage cached resource groups
 */
var resourcePublishers = new Registry();
simpleCache.setItem("feather-resourcePublishers", resourcePublishers);

var availableResourcePublishers = new Registry();
availableResourcePublishers.add(localPublisher);
availableResourcePublishers.add(s3Publisher);

var getPublisher = function(options, callback) {
  var publisher = resourcePublishers.findById(options.cacheName);

  //if we're "flushing" the cache, dispose of the old publisher so a new one is created to force writing new content
  if (publisher && options.flushCache) {
    resourcePublishers.remove(publisher);
    publisher.dispose();
    publisher = null;
  }

  var newCache = false,
    hrefPrefix = typeof options.hrefPrefix === "undefined" ? "/" : options.hrefPrefix,
    resourceOptions = options.appOptions.resources,
    pkg = _.detect(resourceOptions.packages, function(pkg) { 
      return pkg.name === options.cacheName || pkg.publishType === options.publishType; 
    }),
    pkgOptions = _.clone(resourceOptions.publish),
    publisherOptions;

  if (pkg) {
    pkgOptions = _.extend(pkgOptions, pkg);
  }

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
      content: options.content,
      publishType: options.publishType,
      publisherOptions: publisherOptions
    });
    publisher.publishers.add(availableResourcePublishers.findById(publisherOptions.id));
    resourcePublishers.add(publisher);
  } 

  callback(null, _.extend({
    publisher: publisher, 
    pkgOptions: pkgOptions, 
    publisherOptions: publisherOptions, 
    newCache: newCache
  }, options));
};

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
      
      getPublisher(options, function(err, getPubResults) {

        var publisher = getPubResults.publisher, 
          pkgOptions = getPubResults.pkgOptions, 
          publisherOptions = getPubResults.publisherOptions,
          newCache = getPubResults.newCache,
          consolidate = pkgOptions.consolidate,
          minify = pkgOptions.minify,
          $j = options.dom.$j;

        var publish = function(err, publishResult) {
          if (err) {
            //crash with data (including stack info)
            throw new Error("Error publishing: " + err);
          } else {
            if (options.files) {
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
              var filePath = path.join(file.prefix+file.path),
                minifyAllowed = (!file.minifyAllowed || file.minifyAllowed === true); // if it's true or missing, minify is allowed.

              fs.readFile(filePath, "utf8", function(err, content) {        
                if (err) {
                  logger.error({message:"unable to open " + filePath + ": " + err, immediately: true, category:"feather.respack"});
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
      }); // end getPublisher
    });
  }
};

exports.packagePageContent = function(options, callback) {
  if (!options.path || options.path === "") {
    callback("Cannot package page content; path was missing or empty.");
  } else if (!options.html || options.html === "") {
    callback("Cannot package page content; html was missing or empty.");
  } else {

    var cacheName = path.relative(options.appOptions.publicRoot, options.path);

    var pageOptions = _.extend(_.clone(options), {
      cacheName: cacheName,
      hrefPrefix: "",
      contentType: "text/html",
      content: options.html,
      publishType: "pageContent"
    });

    getPublisher(pageOptions, function(err, getPubResult) {
      if (err) {
        callback(err);
      } else {

        getPubResult.publisher.publish(getPubResult.publisherOptions, function(err, publishResult) {
          if (err) {
            throw new Error("Error publishing: " + err);
          } else {

            callback(null, publishResult.path);
          }
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
  simpleCache.getItems([
    'feather-files',
    'feather-restProxyInfo'
  ], function(err, items) {
    var prefix = options.appOptions.featherRoot,
      featherFiles = items['feather-files'],
      restProxyInfo = items['feather-restProxyInfo'];
    
    var cssFiles = [];
    
    // js -----------------------------------------------------------------
    var jsFiles = [
      {path: "/feather-client/lib/underscore-min.js", prefix: prefix},
      options.appOptions["socket.io"].enabled ? {path: "/socket.io/socket.io.js", prefix: prefix, virtual: true} : null,
      {path: "/feather-client/lib/json2.js", prefix: prefix, minifyAllowed: false},
      {path: "/feather-client/lib/jquery-1.7.min.js", prefix: prefix},
      // {path: "/feather-client/lib/jquery-1.9.migrate.min.js", prefix: prefix},
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

    if (options.appOptions.rest && options.appOptions.rest.autoGenerateProxy && restProxyInfo) {
      //add the restProxy files
      jsFiles.push({path: "/feather-client/restProxy.js", prefix: prefix});
      jsFiles.push({
        path: restProxyInfo.path,
        prefix: restProxyInfo.prefix
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
      var uiJSPrefix = prefix,
        uiCSSPrefix = prefix,
        provider = options.appOptions.ui.provider,
        providers = options.appOptions.ui.providers;

      if (typeof provider === 'string') {
        provider = _.find(providers, function(_provider) {
          return _provider.name === provider;
        });
      }

      //get the js files
      var appFiles = _.keys(featherFiles.appFiles);
      if (provider.jsRoot === "/") uiJSPrefix = options.appOptions.publicRoot;
      _.each(provider.jsFiles, function(file) {
        var _path = file,
          _prefix = uiJSPrefix;

        //detect automatic app overrides (via dropping in new files in the /public/_ui folder)
        var fileName = path.basename(file);
        var overrideFile = _.find(appFiles, function(_appFile) {
          return _appFile.indexOf('/public/_ui/' + provider.name + '/js/' + fileName) > -1;
        });

        if (overrideFile) {
          _prefix = options.appOptions.publicRoot;
          _path = '/' + path.relative(options.appOptions.publicRoot, overrideFile);
        }
        
        jsFiles.push({path: _path, prefix: _prefix});
      });

      //get the css files
      if (provider.cssRoot === "/") uiCSSPrefix = options.appOptions.publicRoot;
      _.each(provider.cssFiles, function(file) {
        var _path = file,
          _prefix = uiCSSPrefix;

        //detect automatic app overrides (via dropping in new files in the /public/_ui folder)
        var fileName = path.basename(file);
        var overrideFile = _.find(appFiles, function(_appFile) {
          return _appFile.indexOf('/public/_ui/' + provider.name + '/css/' + fileName) > -1;
        });

        if (overrideFile) {
          _prefix = options.appOptions.publicRoot;
          _path = '/' + path.relative(options.appOptions.publicRoot, overrideFile);
        }
        
        cssFiles.push({path: _path, prefix: _prefix});
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
  });
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
    if (cssUrl.indexOf('http://') === 0 || cssUrl.indexOf('https://') === 0) {
      if (cssUrl.indexOf('login-bkgrd.png') >= 0) debugger;
      return 'url(\'' + cssUrl.replace("'", '').replace('"', '') + '\')';
    } else {
      return path.normalize('url('+ prefix + dir + "/" + cssUrl + ')');
    }
  });
};

function packageWidgetJs(options, callback) {
  var packageInfo = _.extend(_.clone(options), {
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
    cacheName: path.relative(options.appOptions.publicRoot, path.resolve(options.appOptions.publicRoot, options.request.page)) + '.js',
    hrefPrefix: "",
    contentType: "text/javascript",
    files: []
  });
  
  options.widgetClassRegistry.each(function(widgetClass) {
    var widgetJsFiles = [];
    if (widgetClass.classDef && !widgetClass.classDef.prototype.serverOnly) {
      packageInfo.files.push({
        path: widgetClass.clientHrefPath,
        prefix: options.appOptions.publicRoot
      });

      // Include any other js files in the widget's folder.
      widgetJsFiles = _.filter(fs.readdirSync(path.join(options.appOptions.publicRoot, widgetClass.widgetRoot)), function(filename) {
        return path.extname(filename) === ".js" 
                && filename !== path.basename(widgetClass.clientHrefPath) 
                && filename !== (widgetClass.widgetName + '.server.js');
      });

      _.each(widgetJsFiles, function(widgetJsFile) {
        packageInfo.files.push({
          path: widgetClass.widgetRoot + widgetJsFile,
          prefix: options.appOptions.publicRoot
        });
      });
    }
  });
  exports.packageResources(packageInfo, callback, true);
}

function packageWidgetCss(options, callback) {
  
  var packageInfo = _.extend(_.clone(options), {
    template: '<link rel="stylesheet" type="text/css" href="${href}" />',
    cacheName:  path.relative(options.appOptions.publicRoot, path.resolve(options.appOptions.publicRoot, options.request.page)) + '.css',
    hrefPrefix: "",
    contentType: "text/css",
    files: []
  });

  options.widgetClassRegistry.each(function(widgetClass) {
    var widgetCssFiles = [];
    if (widgetClass.classDef && !widgetClass.classDef.prototype.serverOnly) {
      packageInfo.files.push({
        path: widgetClass.clientCssHrefPath,
        prefix: options.appOptions.publicRoot
      });

      // Include any other css files in the widget's folder.
      widgetCssFiles = _.filter(fs.readdirSync(path.join(options.appOptions.publicRoot, widgetClass.widgetRoot)), function(filename) {
        return path.extname(filename) === ".css" && filename !== path.basename(widgetClass.clientCssHrefPath);
      });

      _.each(widgetCssFiles, function(widgetCssFile) {
        packageInfo.files.push({
          path: widgetClass.widgetRoot + widgetCssFile,
          prefix: options.appOptions.publicRoot
        });
      });
    }
  });
  exports.packageResources(packageInfo, callback);
}