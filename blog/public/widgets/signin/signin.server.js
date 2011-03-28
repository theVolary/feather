jojo.ns("blog");

var sys = require("sys");

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
      if (params.client.session && params.client.session.username) {
        return params.client.session.username;
      }
    }),
    signIn: jojo.widget.serverMethod(function(params, username) {
      jojo.logger.info("Logging in user " + username);
      params.client.session.username = username;
      return true;
    })
	}		
});
