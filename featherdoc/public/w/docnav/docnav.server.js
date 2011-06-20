exports.getWidget = function(feather, cb) {
  feather.ns("featherdoc");
  feather.navItems = [
    // Paths should be local to featherdoc, not public.
    {type:'markdown', name:'Setup README', method:'fs', path:'../README.md'},
    {type:'markdown', name:'Data', method:'fs', path:'docs/data.md'},
    {type:'markdown', name:'Applications', method:'fs', path:'docs/applications.md'},
    {type:'markdown', name:'Auth', method:'fs', path:'docs/auth.md'},
    {type:'markdown', name:'Logging', method:'fs', path:'docs/logging.md'},
    {type:'markdown', name:'Testing Apps', method:'fs', path:'docs/testing.md'},
    {type:'api', name:'Server API', method:'url', path:'/docs/api/server/index.html'},
    {type:'api', name:'Client API', method:'url', path:'/docs/api/client/index.html'}
  ];

  featherdoc.getNavItems = function(cb) {
    cb && cb(null, {navItems: featherdoc.navItems });
  };

  cb(null, {
    name: "featherdoc.docnav",
    path: "w/docnav/"
  });
};