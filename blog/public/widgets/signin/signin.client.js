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
				  var ok = false;
				  for (var i = 0; i < blog.users.length; i++) {
				    if (blog.users[i] === user) {
				      ok = true;
				      me.server_signIn([user], function(result) {
				        if (result.success) {
  				        blog.auth = { username: user };
    				      me.get("#signinform").hide();
    				      me.get("#signedin").empty().append($.tmpl('Welcome ${user}.  <input type="button" id="${id}_signoutBtn" value="Sign Out" />', {user:user, id:me.id}) ).show();
    				      me.domEvents.bind(me.get("#signoutBtn"), "click", function() {
    				        me.get("#signedin").hide();
    				        me.get("#signinform").show();
    				        me.fire('signedOut');
    				      });
    				      me.fire('signedIn');
  				      } else {
  				        me.get('#message').append(result.err.message);
  				        me.fire('signinFailed', result);
  				      }
				      });
				      
				    }
				  } // end for
				  if (!ok) {
  				  me.get('#message').append('Invalid username ' + user);
  				  me.fire('signinFailed', {err: "Invalid username " + user});
				  }
				}); // end signinButton click
				
				me.server_verifySignin(function(result) {
				  if(! result.err) {
				    if (result.result) { // already signed in.
				      blog.auth = { username: result.result };
    				  me.get("#signinform").hide();
    		      me.get("#signedin").empty().append($.tmpl('Welcome ${user}.  <input type="button" id="${id}_signoutBtn" value="Sign Out" />', {user:result.result, id:me.id}) ).show();
    		      me.domEvents.bind(me.get("#signoutBtn"), "click", function() {
				        me.get("#signedin").hide();
				        me.get("#signinform").show();
				        me.fire('signedOut');
				      });
    		      me.fire('signedIn');
    				}
				  }
				});
			} // end onReady
		}
	});

})();
