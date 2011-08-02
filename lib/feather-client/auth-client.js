(function() {

  /** @namespace container for all things auth related.
   * @name feather.auth
   */
  feather.ns("feather.auth");
  
  var DEFAULT_AUTHORITY = "guest";
  
  var userAddons = {
    isLoggedIn: function() { 
      return this.authenticated; 
    },
    hasAuthority: function(named) {
      if (typeof named === "string") {
        return (this.authorities && _.indexOf(this.authorities, named) >= 0);
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
   * @description A singleton instance of {@link FiniteStateMachine} available to apps that acts as a very basic authentication facade.
   */
  feather.auth.api = new feather.FiniteStateMachine({
    states: {
      initial: {
        stateStartup: function() {
          var me = this;
          feather.socket.stateMachine.onceState("ready", function() {
            me.fire("socketReady");
          });
        },
        socketReady: function() {
          var me = this;
          this.getUser(function(err, user) {
            if (!err) {
              _.extend(user, userAddons);
              feather.auth.user = user;
              me.fire("userRetrieved");
            } else {
              me.fire("noUserFound");
            }
          });
        },
        userRetrieved: function() {
          return this.states.authenticated;
        },
        noUserFound: function() {
          return this.states.anonymous;
        }
      },
      anonymous: {
        loggingIn: function(username) {
          console && console.log('logging in ' + username);
        },
        loginSuccessful: function() {
          return this.states.authenticated;
        },
        loginFailed: function() {
          
        }
      },
      authenticated: {
        stateStartup: function() {
          this.fire('authenticated');
        },
        loggingOut: function() {
          feather.auth.user = null;       
          this.fire("loggedOut");
          return this.states.anonymous;
        }
      }
    }
  });

  // Helper methods that will pass the request through to the server and handle the internal state machine. 
  _.extend(feather.auth.api, {   
    signup: function(options) {
      if (this.authenticated) {
        return false;
      }
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
      fsm.fire("loggingIn", username);
      feather.socket.sysBus.once("auth:login", function(args) {
        if (!args.err) {
          /** 
           * The user object, once the user has been authenticated
           * @name feather.auth.user
           * @type feather.auth.userClass
           */
          _.extend(args.user, userAddons);
          feather.auth.user = args.user;
          fsm.fire("loginSuccessful");
        } else {
          fsm.fire("loginFailed", args.err);
        }
        cb && cb(args.err);
      });
      
      feather.socket.sysBus.fire("auth:login", {
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
      feather.socket.sysBus.once("auth:logout", function(args) {
        if (!args.err) {
          //set the new cookie token
          $.cookie(feather.appOptions.sessionCookie, args.result);
          feather.sid = args.result;   
          feather.auth.user = null;       
        }
        cb && cb(args.err);
      });
      feather.socket.sysBus.fire("auth:logout");
    },
    
    /**
     * Retrieves the user from the client's session on the server, and returns it via the callback function.
     * @param {Object} cb receives up to two parameters.  The first is always the error.  If null, the second will be the user object.
     */
    getUser: function(cb) {
      var fsm = this;
      feather.socket.sysBus.once("auth:getUser", function(args) {
        if (!args.err) {
          cb && cb(null, args.user);
        } else {
          cb && cb(args.err);
        }
      });
      feather.socket.sysBus.fire("auth:getUser");
    }
  });
})();