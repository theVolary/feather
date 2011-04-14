jojo.ns("blog");

blog.signin = jojo.widget.create({
	name: "blog.signin",
	path: "widgets/signin/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		},
    onRender: function() {
      
    },
    verifySignin: jojo.widget.serverMethod(function(params) {
      if (jojo.request.session && jojo.request.session.user) {
        return jojo.request.session.user;
      }
    }),
    signIn: jojo.widget.serverMethod(function(params, username, password) {
      jojo.auth.api.login({
        username: username,
        password: password
      });
    })
	}		
});
