feather.ns("blog");

blog.signin = feather.widget.create({
	name: "blog.signin",
	path: "widgets/signin/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		},
    onRender: function() {
      
    },
    verifySignin: feather.widget.serverMethod(function(cb) {
      if (this.request.session && this.request.session.user) {
        cb(null, this.request.session.user);
      } else {
        cb("No user in session");
      }
    })
	}		
});
