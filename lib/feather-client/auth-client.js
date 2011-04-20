/** @namespace container for all things auth related.
 * @name feather.auth
 */
(function() { //module pattern for client-safety, as this code could run on either the client or the server
  feather.ns("feather.auth");
  
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
  feather.auth.clientAuthInterface = Class.create(feather.fsm.finiteStateMachine, {
    states: {
      initial: {
        stateStartup: function(fsm, args) {
          feather.socket.stateMachine.onceState("ready", function() {
            fsm.fire("socketReady");
          });
        },
        socketReady: function(fsm, args) {
          fsm.getUser(function(err, user) {
            if (!err) {
              feather.auth.user = user;
              fsm.fire("userRetrieved");
            } else {
              fsm.fire("noUserFound");
            }
          });
        },
        userRetrieved: function(fsm, args) {
          return fsm.states.authenticated;
        },
        noUserFound: function(fsm, args) {
          return fsm.states.anonymous;
        }
      },
      anonymous: {
        loggingIn: function(fsm, args) {
          console && console.log('logging in ' + args.username);
        },
        loginSuccessful: function(fsm, args) {
          return fsm.states.authenticated;
        },
        loginFailed: function(fsm, args) {
          
        }
      },
      authenticated: {
        stateStartup: function(fsm, args) {
          fsm.fire('authenticated');
        },
        loggingOut: function(fsm, args) {
          fsm.fire("loggedOut");
          return fsm.states.anonymous;
        }
      }
    },
    
    // Helper methods that will pass the request through to the server and handle the internal state machine.
    signup: function(options) {
      if (this.authenticated) {
        return false;
      }
      
      // TODO: Send socket message for signup.
    },
    login: function(username, password, cb) {
      var fsm = this;
      fsm.fire("loggingIn", {username: username});
      feather.socket.sysChannel.once("auth:login", function(result) {
        if (!result.err) {
          /** 
           * @name feather.auth.user
           * @description  (client only) the user object, once the user has been authenticated
           * @type feather.auth.userClass
           */
          feather.auth.user = result.user;
          for (var p in userAddons) {
            feather.auth.user[p] = userAddons[p];
          }
          fsm.fire("loginSuccessful");
        } else {
          fsm.fire("loginFailed", {error: result.err});
        }
        cb && cb(result.err);
      });
      
      feather.socket.sysChannel.fire("auth:login", {
        username: username,
        password: password
      });
    },
    logout: function(cb) {
      this.fire("loggingOut");
      feather.socket.sysChannel.once("auth:logout", function(args) {
        cb && cb(args.err);
      });
      feather.socket.sysChannel.fire("auth:logout");
    },
    getUser: function(cb) {
      var fsm = this;
      feather.socket.sysChannel.once("auth:getUser", function(args) {
        if (!args.err) {
          cb && cb(null, args.result.user);
        } else {
          cb && cb(args.err);
        }
      });
      feather.socket.sysChannel.fire("auth:getUser");
    }
  });
  
  feather.auth.api = new feather.auth.clientAuthInterface();
})();