jojo.ns("blog");
(function() {

	blog.signin = jojo.widget.create({
		name: "blog.signin",
		path: "widgets/signin/",		
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
				var me = this;
				jojo.auth.api.on("loggedOut", function() {
          me.get("#signedin").hide();
          me.get("#signinform").show();
				});
				this.domEvents.bind(this.get("#signinButton"), "click", function() {
				  var user = me.get('#username').val();
				  var pass = me.get('#password').val();
				  jojo.auth.api.login({ username: user, password: pass }, function(err) {
				    if (!err) {
              me.showLoggedIn();
				    } else {
				      me.get('#message').append(err);
				    }
				  }); // end login call.
				}); // end signinButton click
				me.showLoggedIn();
			}, // end onReady
			showLoggedIn: function() {
			  var me = this;
			  if (jojo.auth.user && jojo.auth.user.isLoggedIn()) {
  			  me.get("#signinform").hide();
          me.get("#signedin").empty().append($.tmpl('Welcome ${user}.  <input type="button" id="${id}_signoutBtn" value="Sign Out" />', {user:jojo.auth.user.username, id:me.id}) ).show();
          me.domEvents.bind(me.get("#signoutBtn"), "click", function() {
            jojo.auth.api.logout();
          });
        }
			} // end showLoggedIn.
		}
	});

})();
