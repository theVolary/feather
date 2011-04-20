feather.ns("featherdoc");

featherdoc.navItems = [
  {type:'markdown', name:'Test', url:'https://github.com/ther/http-basic-auth/raw/master/README.md'},
  {type:'markdown', name:'Data', url:'https://github.com/skrenek/jojojs/raw/master/docs/data.md'},
  {type:'markdown', name:'Applications', url:'https://github.com/skrenek/jojojs/raw/master/docs/applications.md'},
  {type:'markdown', name:'Auth', url:'https://github.com/skrenek/jojojs/raw/master/docs/auth.md'},
  {type:'markdown', name:'Logging', url:'https://github.com/skrenek/jojojs/raw/master/docs/logging.md'},
  {type:'markdown', name:'Testing Apps', url:'https://github.com/skrenek/jojojs/raw/master/docs/testing.md'},
  {type:'api', name:'API Docs', url:'/docs/api/index.html'}
];

featherdoc.getNavItems = function(cb) {
  cb && cb({navItems: featherdoc.navItems });
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
