/** @namespace container for all things auth related.
 * @name jojo.auth
 */
(function() { //module pattern for client-safety, as this code could run on either the client or the server
  jojo.ns("jojo.auth");
  
  var DEFAULT_AUTHORITY = "guest";
  
  var userAddons = {
    isLoggedIn: function() { 
      return this.authenticated; 
    },
    hasAuthority: function(named) {
      if (typeof named === "string") {
        return (this.authorities && this.authorities.indexOf(named) >= 0);
      } 
      return false;
    },
    hasAnyAuthority: function(list) {
      for (var i = 0; i < list.length; i++) {
        if (this.hasAuthority(list[i])) 
          return true;
      }
      return false;
    },
    hasAllAuthorities: function(list) {
      for (var i = 0; i < list.length; i++) {
        if (! this.hasAuthority(list[i]))
          return false;
      }
      return true;
    }
  };
  
  /**
   *  @class a client-side auth interface
   */
  jojo.auth.clientAuthInterface = Class.create(jojo.fsm.finiteStateMachine, {
    states: {
      initial: {
        stateStartup: function(fsm, args) {
          jojo.socket.stateMachine.onceState("ready", function() {
            fsm.fire("socketReady");
          });
        },
        socketReady: function(fsm, args) {
          fsm.getUser(function(user) {
            if (user) {
              fsm.fire("userRetrieved");
            }
          });
          return fsm.states.anonymous;
        },
        userRetrieved: function(fsm, args) {
          return fsm.states.authenticated;
        }
      },
      anonymous: {
        stateStartup: function(fsm, args) {
          fsm.user = null;
        },
        loggingIn: function(fsm, args) {
          console && console.log('logging in ' + args);
        },
        loginSuccessful: function(fsm, args) {
          return fsm.states.authenticated;
        },
        loginFailed: function(fsm, args) {
          
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
      jojo.socket.sysChannel.once("auth:login", function(result) {
        if (! result.err) {
          /** 
           * @name jojo.auth.user
           * @description  (client only) the user object, once the user has been authenticated
           * @type jojo.auth.userClass
           */
          jojo.auth.user = result.data;
          for (var p in userAddons) {
            jojo.auth.user[p] = userAddons[p];
          }
          fsm.fire("loginSuccessful", result.data);
        } else {
          fsm.fire("loginFailed", result.err);
        }
        callback && callback(result.err);
      });
      
      jojo.socket.sysChannel.fire("auth:login", {
        username: options.username,
        password: options.password
      });
    },
    logout: function(options) {
      this.fire("loggingOut");
    },
    getUser: function(callback) {
      var fsm = this;
      jojo.socket.sysChannel.once("auth:getUser", function(result) {
        jojo.auth.user = result;
        callback && callback(jojo.auth.user);
      });
      jojo.socket.sysChannel.fire("auth:getUser", {});
    }
  });
  
  jojo.auth.api = new jojo.auth.clientAuthInterface();
})();