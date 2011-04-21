(function() { //module pattern for client-safety, as this code could run on either the client or the server
  /** @namespace container for all things auth related.
   * @name feather.auth
   */
  feather.ns("feather.auth");
  
  var DEFAULT_AUTHORITY = "guest";
  
  var userAddons = /** @lends feather.auth.clientAuthInterface */ {
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
   *  @extends feather.fsm.finiteStateMachine
   */
  feather.auth.clientAuthInterface = Class.create(feather.fsm.finiteStateMachine, /** @lends feather.auth.clientAuthInterface.prototype */ {
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
              Object.extend(user, userAddons);
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
    
    /**
     * Initiates login with the server.  On completion, calls the callback 
     * method with the error (null if successful).  When the callback is 
     * executed, the function can access the user via the singleton {@link feather.auth.user}. 
     * @param {Object} username
     * @param {Object} password
     * @param {Object} cb
     */
    login: function(username, password, cb) {
      var fsm = this;
      fsm.fire("loggingIn", {username: username});
      feather.socket.sysChannel.once("auth:login", function(args) {
        if (!args.err) {
          /** 
           * The user object, once the user has been authenticated
           * @name feather.auth.user
           * @type feather.auth.userClass
           */
          Object.extend(args.user, userAddons);
          feather.auth.user = args.user;
          fsm.fire("loginSuccessful");
        } else {
          fsm.fire("loginFailed", {error: args.err});
        }
        cb && cb(args.err);
      });
      
      feather.socket.sysChannel.fire("auth:login", {
        username: username,
        password: password
      });
    },
    
    /**
     * Sends a logout request to the server, and calls the callback on completion.  The callback receives one parameter: err.
     * @param {Object} cb
     */
    logout: function(cb) {
      this.fire("loggingOut");
      feather.socket.sysChannel.once("auth:logout", function(args) {
        cb && cb(args.err);
      });
      feather.socket.sysChannel.fire("auth:logout");
    },
    
    /**
     * Retrieves the user from the client's session on the server, and returns it via the callback function.
     * @param {Object} cb receives up to two parameters.  The first is always the error.  If null, the second will be the user object.
     */
    getUser: function(cb) {
      var fsm = this;
      feather.socket.sysChannel.once("auth:getUser", function(args) {
        if (!args.err) {
          cb && cb(null, args.user);
        } else {
          cb && cb(args.err);
        }
      });
      feather.socket.sysChannel.fire("auth:getUser");
    }
  });
  
  /**
   * @description A singleton instance of {@link feather.auth.clientAuthInterface} available to apps.
   */
  feather.auth.api = new feather.auth.clientAuthInterface();
})();