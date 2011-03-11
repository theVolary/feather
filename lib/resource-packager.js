var sys = require("sys"),
    fs  = require("fs");

exports.package = function(options) {
  this.packageCss(options);
  this.packageJs(options);
};

exports.packageJs = function(options) {
  
  packageResource({
    resourceType: 'js',
    resourcePathExt: '.client.js',
    resourceCache: jojo.widgetClientFiles,
    debug: options.debug,
    template: '<clientscript type="text/javascript" src="${href}"></clientscript>',
  });
};

exports.packageCss = function(options) {
  
  packageResource({
    resourceType: 'css',
    resourcePathExt: '.css',
    resourceCache: jojo.cssFiles,
    debug: options.debug,
    template: '<link rel="stylesheet" type="text/css" href="${href}" />'
  });
};

function packageResource(options) {
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