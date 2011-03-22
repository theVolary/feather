jojo.ns("blog");
(function() {
  
  blog.users = [
    "admin",
    "editor",
    "reader"
  ];

	blog.signin = jojo.widget.create({
		name: "blog.signin",
		path: "widgets/signin/",		
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
				var me = this;
				this.domEvents.bind(this.get("#signinButton"), "click", function() {
				  var user = me.get('#username').val();
				  for (var i = 0; i < blog.users.length; i++) {
				    if (blog.users[i] === user) {
				      blog.auth = { username: user };
				      me.get("#signinform").hide();
				      me.get("#signedin").empty().append($.tmpl('Welcome ${user}.  <input type="button" id="${id}_signoutBtn" value="Sign Out" />', {user:user, id:me.id}) ).show();
				      me.domEvents.bind(me.get("#signoutBtn"), "click", function() {
				        me.get("#signedin").hide();
				        me.get("#signinform").show();
				        me.fire('signedOut');
				      });
				      me.fire('signedIn');
				      return;
				    }
				  } // end for
				  me.get('#message').append('Invalid username ' + user);
				  me.fire('signinFailed', {err: "Invalid username " + user});
				});
			} // end onReady
		}
	});

})();
