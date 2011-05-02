feather.ns("blog");
(function() {

	blog.signin = feather.widget.create({
		name: "blog.signin",
		path: "widgets/signin/",		
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
				var me = this;
        
        /**
         * create an FSM to handle ui states
         */
        var fsm = new feather.fsm.finiteStateMachine({
          states: {
            initial: {
              stateStartup: function(fsm, args) {
                //cache the templates
                me.signedInTemplate = me.templates.findById("signedIn");
                me.signedOutTemplate = me.templates.findById("signedOut");
                if (me.get("#signoutBtn").length) {
                  return fsm.states.loggedIn;
                }
                return fsm.states.loggedOut;
              }
            },
            loggedIn: {
              stateStartup: function(fsm, args) {
                if (!me.get("#signoutBtn").length) {
                  me.get("#signInPanel").html("");
                  $.tmpl(me.signedInTemplate.tmpl, {user: feather.auth.user}).appendTo(me.get("#signInPanel"));
                }
                //wire the signInHandler
                me.signOutHandler = me.domEvents.bind(me.get("#signoutBtn"), "click", function() {
                  feather.auth.api.logout(function(err) {
                    if (!err) {
                      fsm.fire("loggedOut");
                    } else {
                      me.get('#message').empty().append(err);
                    }
                  });                  
                });
              },
              loggedOut: function(fsm, args) {
                return fsm.states.loggedOut;
              },
              leavingState: function(fsm, args) {
                me.signOutHandler.unbind();
                me.signOutHandler = null;
              }
            }, //end loggedIn state
            loggedOut: {
              stateStartup: function(fsm, args) {
                if (!me.get(".templating_error").length) {
                  if (!me.get("#signinBtn").length) {
                    me.get("#signInPanel").html("");
                    $.tmpl(me.signedOutTemplate.tmpl).appendTo(me.get("#signInPanel"));
                  }
                  //wire the signInHandler
                  me.signInHandler = me.domEvents.bind(me.get("#signinBtn"), "click", function() {
                    var user = me.get('#username').val();
                    var pass = me.get('#password').val();
                    feather.auth.api.login(user, pass, function(err) {
                      if (!err) {
                        fsm.fire("loggedIn");
                      } else {
                        me.get('#message').empty().append(err);
                      }
                    }); // end login call.
                  }); // end signinButton click
                }
              }, 
              loggedIn: function(fsm, args) {
                return fsm.states.loggedIn;
              },
              leavingState: function(fsm, args) {
                me.signInHandler.unbind();
                me.signInHandler = null;
              }
            } //end loggedOutState
          }
        });
			} // end onReady
		}
	});

})();
