(function() { //module pattern for client-safety, as this code could run on either the client or the server
  jojo.ns("jojo.data.auth");
  
  var DEFAULT_AUTHORITY = "guest";
  
  /**
   *  This class is a client-side interface representing a user.
   */
  jojo.data.auth.userInterface = Class.create(jojo.fsm.finiteStateMachine, {
    states: {
      initial: {
        stateStartup: function(fsm, args) {
           return fsm.states.anonymous;
        }
      },
      anonymous: {
        stateStartup: function(fsm, args) {
          fsm.authenticated = false;
          fsm.username = 'anonymous;'
          fsm.authorities = [DEFAULT_ROLE];
        },
        loggingIn: function(fsm, args) { },
        loginSuccessful: function(fsm, args) {
          fsm.username = args.username;
          fsm.profile = args.profile;
          fsm.roles = args.authorities;
          return fsm.states.authenticated;
        }
      },
      authenticated: {
        stateStartup: function(fsm, args) {
          fsm.authenticated = true;
          // Go get the authorities for the user.
          
          fsm.fire('authenticated', fsm.username);
        },
        loggingOut: function(fsm, args) {
          return fsm.states.anonymous;
        }
      }
    },
    username: 'anonymous',
    profile: null,
    authorities: [DEFAULT_AUTHORITY],
    authenticated: false,
    
    // Helper methods that will pass the request through to the server and handle the internal state machine.
    // THESE ARE TO BE CALLED FROM THE CLIENT SIDE!
    signup: function(options) {
      if (this.authenticated) {
        return false;
      }
      
      // TODO: Send socket message for signup.
    },
    login: function(options, callback) {
      this.fire("loggingIn", options.username);
      jojo.socket.send({
        type:"rpc",
        subtype:"auth",
        data: {
          method: "login",
          username: options.username,
          password: jojo.data.auth.hash(options.password)
        },
        callback: function(result) {
          if (result.success) {
            this.fire("loginSuccessful", result.result);
          } else {
            this.fire("loginFailed", result.err);
          }
        }
      });
    },
    logout: function(options) {
      this.fire("loggingOut");
    },
    isLoggedIn: function() {
      return this.authenticated;
    },
    hasAuthority: function(named) {
      return (this.authorities && this.authorities.indexOf(named) >= 0);
    }
  });
})();