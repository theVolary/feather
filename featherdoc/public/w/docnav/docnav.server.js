feather.ns("featherdoc");

//featherdoc.navItems = [
//  {type:'markdown', name:'Test', url:'https://github.com/ther/http-basic-auth/raw/master/README.md'},
//  {type:'markdown', name:'Data', url:'https://github.com/skrenek/jojojs/raw/master/docs/data.md'},
//  {type:'markdown', name:'Applications', url:'https://github.com/skrenek/jojojs/raw/master/docs/applications.md'},
//  {type:'markdown', name:'Auth', url:'https://github.com/skrenek/jojojs/raw/master/docs/auth.md'},
//  {type:'markdown', name:'Logging', url:'https://github.com/skrenek/jojojs/raw/master/docs/logging.md'},
//  {type:'markdown', name:'Testing Apps', url:'https://github.com/skrenek/jojojs/raw/master/docs/testing.md'},
//  {type:'api', name:'Server API', url:'/docs/api/server/index.html'},
//  {type:'api', name:'Client API', url:'/docs/api/client/index.html'}
//];
featherdoc.navItems = [
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

featherdoc.docnav = feather.widget.create({
	name: "featherdoc.docnav",
	path: "w/docnav/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		}
	}		
});
