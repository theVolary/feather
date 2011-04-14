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
    verifySignin: feather.widget.serverMethod(function(params) {
      if (feather.request.session && feather.request.session.user) {
        return feather.request.session.user;
      }
    }),
    signIn: feather.widget.serverMethod(function(params, username, password) {
      feather.auth.api.login({
        username: username,
        password: password
      });
    })
	}		
});
