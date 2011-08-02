feather.ns("blog");
(function() {

  blog.signin = feather.Widget.create({
    name: "blog.signin",
    path: "widgets/signin/",    
    prototype: {
      onReady: function(args) {
        var me = this;
        
        /**
         * create an FSM to handle ui states
         */
        var fsm = new feather.FiniteStateMachine({
          states: {
            initial: {
              stateStartup: function() {
                if (me.get("#signoutBtn").length) {
                  return this.states.loggedIn;
                }
                return this.states.loggedOut;
              }
            },
            loggedIn: {
              stateStartup: function() {
                var fsm = this;
                if (!me.get("#signoutBtn").length) {
                  me.get("#signInPanel").html("");
                  $.tmpl(me.templates.signedIn, {}).appendTo(me.get("#signInPanel"));
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
              loggedOut: function() {
                return this.states.loggedOut;
              },
              leavingState: function() {
                me.signOutHandler.unbind();
                me.signOutHandler = null;
              }
            }, //end loggedIn state
            loggedOut: {
              stateStartup: function() {
                var fsm = this;
                if (!me.get(".templating_error").length) {
                  if (!me.get("#signinBtn").length) {
                    me.get("#signInPanel").html("");
                    $.tmpl(me.templates.signedOut).appendTo(me.get("#signInPanel"));
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
              loggedIn: function() {
                return this.states.loggedIn;
              },
              leavingState: function() {
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
