(function() { //module pattern for client-safety, as this code could run on either the client or the server
  jojo.ns("jojo.auth");
  
  var DEFAULT_AUTHORITY = "guest";
  
  /**
   *  This class is a client-side interface representing a user.
   */
  jojo.auth.userInterface = Class.create(jojo.fsm.finiteStateMachine, {
    states: {
      initial: {
        stateStartup: function(fsm, args) {
          jojo.socket.stateMachine.onceState("ready", function() {
            fsm.fire("socketReady");
          });
        },
        socketReady: function(fsm, args) {
          return fsm.states.anonymous;
        }
      },
      anonymous: {
        stateStartup: function(fsm, args) {
          fsm.user = null;
        },
        loggingIn: function(fsm, args) { },
        loginSuccessful: function(fsm, args) {
          fsm.user = args;
          return fsm.states.authenticated;
        }
      },
      authenticated: {
        stateStartup: function(fsm, args) {
          fsm.fire('authenticated', fsm.username);
        },
        loggingOut: function(fsm, args) {
          fsm.fire("loggedOut");
          return fsm.states.anonymous;
        }
      }
    },
    user: null, // becomes fsm.user in events handlers.
    
    // Helper methods that will pass the request through to the server and handle the internal state machine.
    // THESE ARE TO BE CALLED FROM THE CLIENT SIDE!
    signup: function(options) {
      if (this.authenticated) {
        return false;
      }
      
      // TODO: Send socket message for signup.
    },
    login: function(options, callback) {
      var fsm = this;
      fsm.fire("loggingIn", options.username);
      jojo.socket.sysChannel.once("login", function(result) {
        if (! result.err) {
          fsm.fire("loginSuccessful", result.data);
        } else {
          fsm.fire("loginFailed", result.err);
        }
      });
      
      jojo.socket.sysChannel.fire("auth:login", {
        username: options.username,
        password: jojo.data.auth.hash(options.password)
      });
    },
    logout: function(options) {
      this.fire("loggingOut");
    }
  });
})();