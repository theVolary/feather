var fs = require("fs"),
    path = require("path"),
    _ = require("underscore")._;

exports.getWidget = function(feather, cb) {
  feather.ns("featherdoc");
  featherdoc.navItems = [
    // Paths should be local to featherdoc, not public.
    {type:'markdown', name:'Setup README', method:'fs', path:'../README.md'},
  ];

  fs.readdir("docs", function(err, files) {
    
    _.each(files, function(f) {
      
      if (path.extname(f) === ".md") {
        var name = path.basename(f, '.md');
        name = name.charAt(0).toUpperCase() + name.substring(1);
        featherdoc.navItems.push({type:'markdown', method:'fs', path:'docs/'+path.basename(f), name:name});
      }
    });

    featherdoc.navItems.push({type:'api', name:'Server API', method:'url', path:'/docs/api/server/index.html'});
    featherdoc.navItems.push({type:'api', name:'Client API', method:'url', path:'/docs/api/client/index.html'});

    
  });

  featherdoc.getNavItems = function(callback) {
    callback && callback(null, {navItems: featherdoc.navItems });
  };

  cb(null, {
      name: "featherdoc.docnav",
      path: "widgets/docnav/"
    });
};