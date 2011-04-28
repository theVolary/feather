var DEFAULT_AUTHORITY = "guest";

function resolveAuthorities(authorities) {
  var curr,
      type, 
      outAuths = [];
      
  for (var i = 0; i < authorities.length; i++) {
    curr = authorities[i];
    type = typeof(curr);
    if (type === 'string') {
      outAuths.push(curr);
    } else if (type === 'object') {
      // TODO:
      // The auth is an object (such as a lease).  Resolve it into a string "role".
      // If it is a lease, validate the lease (expiration etc.).  If the lease is 
      // still valid, push the name onto the list.
    }
  }
  
  return outAuths;
}

exports.init = function(appOptions) {
  /**
   * @namespace container namespace for all things auth related
   * @name feather.auth
   */
  feather.ns("feather.auth");

  /**
   * @class represents a user object on the server.  Instances are usually stuffed in a user's session.
   * @property {String} username the user's username
   * @property {Object} profile the user's profile object, if available
   * @property {Array} authorities an array of the authorities (roles) a user has granted to them
   * @property {boolean} authenticated true if the user is logged in
   */  
  feather.auth.userClass = Class.create(/** @lends feather.auth.userClass.prototype */{
    /**
     * @constructs
     * @param {Object} options can contain any of the following properties: username, profile, authorities (array), authenticated (boolean)
     */
    initialize: function(options) {
      this.username = options.username || 'anonymous';
      this.profile = options.profile || null;
      this.authorities = options.authorities || [DEFAULT_AUTHORITY];
      this.authenticated = false;
      if (options.authenticated) {
        this.authenticated = true;
      }
    },
    /**
     * note: making this a method call to support adding other conditions in the future without requiring api changes
     * @returns {boolean} the value of "authenticated".
     */
    isLoggedIn: function() { 
      return this.authenticated; 
    },
    /**
     * @param {String} named the authority to test for
     * @returns {boolean} returns true if the user has the named authority
     */
    hasAuthority: function(named) {
      if (typeof named === "string") {
        return (this.authorities && this.authorities.indexOf(named) >= 0);
      } 
      return false;
    },
    /**
     * @param {Array} list an array of named authorities to test for
     * @returns {boolean} returns true if the user has any of the authorities in the given list
     */
    hasAnyAuthority: function(list) {
      for (var i = 0; i < list.length; i++) {
        if (this.hasAuthority(list[i])) 
          return true;
      }
      return false;
    },
    /**
     * @param {Array} list an array of named authorities to test for
     * @returns {boolean} returns true if the user has all of the authorities in the given list
     */
    hasAllAuthorities: function(list) {
      for (var i = 0; i < list.length; i++) {
        if (! this.hasAuthority(list[i]))
          return false;
      }
      return true;
    }
  });
  
  /**
   * @class manages all auth communication between client and server.  Listens to socket sysChannel events prefixed with "auth:".  Do NOT create instances of this class.  A singleton is managed for you by the framework {@link feather.auth.api}.
   */
  feather.auth.authInterface = Class.create(feather.event.eventPublisher, /** @lends feather.auth.authInterface.prototype */{
    /** @constructs */
    initialize: function($super, options) {
      $super(options);
      var me = this;
      
      // initialize event listeners
      feather.socket.on("auth:login", function(args) {
        var eventArgs = args.message.data.eventArgs;
        me.loginBySessionId(args.message.sid, eventArgs.username, eventArgs.password, function(err, loginResult) {
          var result = {success: true};
          if (err) {
            result.success = false;
            result.err = err;
          } else {
            result.user = loginResult.user;
          }
          args.result.eventArgs = result;
          args.client.send(args.result);       
        });
      });
      
      feather.socket.on("auth:getUser", function(args) {
        me.getUserBySessionId(args.message.sid, function(err, getUserResult) {
          var result = {success: true};
          if (err || !getUserResult || !getUserResult.user) {
            result.success = false;
            result.err = err || "No user found.";
            feather.logger.trace("user err: " + result.err);
          } else {
            result.user = getUserResult.user;
            feather.logger.trace("user: " + require("sys").inspect(getUserResult));            
          }
          args.result.eventArgs = result;
          args.client.send(args.result);          
        });
      });
      
      feather.socket.on("auth:logout", function(args) {
        me.logoutBySessionId(args.message.sid, function(err) {
          var result = {success: true};
          if (err) {
            result.success = false;
            result.err = err;
          }
          args.result.eventArgs = result;
          args.client.send(args.result); 
        });
      });
    },
    /**
     * Logs in by session id, username, and password.
     * If no sessionId is provided, an attempt will be made to use the current request's session.
     * If successful, the resulting user is passed into the callback function, otherwise an error is passed.
     * @param {String} sessionId The sessionId to automatically store the returned user object in, or null is no storage is desired
     * @param {String} username Username of the user to login
     * @param {String} password Password of the user to login
     * @param {Function} cb Callback function to call with result of the login attempt
     * @return undefined
     */
    loginBySessionId: function(sessionId, username, password, cb) {
      cb = cb || feather.emptyFn;
      if (!sessionId) {
        cb("Session id is required for loginBySessionId method.");
      } else {        
        if (!username || !password) {
          cb("No username or password submitted.");
        }
        feather.logger.debug({message: "Getting user ${prefix}${user}", replacements:{prefix:feather.appOptions.auth.userIdPrefix, user:username}, category:'feather.auth'});
        feather.data.authdb.get(feather.appOptions.auth.userIdPrefix + username, function(err, dbResult) {
          if (!err) {
            //var hashedPass = feather.auth.hash(dbResult.password); // TODO: Assumes passwords are stored unhashed (plain) in db, which is probably wrong.
            if (dbResult.password === password) {
              var user = new feather.auth.userClass({
                authenticated: true,
                profile: dbResult.profile || {},
                username: (dbResult.profile && dbResult.profile.username) || dbResult.username || dbResult.name,
                authorities: resolveAuthorities(dbResult.roles || dbResult.authorities)
              });
              feather.server.sessionStore.get(sessionId, function(err, sess) {
                if (!err) {
                  sess.user = user;
                  feather.server.sessionStore.set(sessionId, sess);
                  cb(null, {user: user});
                } else {
                  cb(err);
                }
              });
            } else {
              feather.logger.warn("Invalid login attempt for username '" + username + "'");
              cb("Invalid username/password");
            }
          } else {
            if (err.error && err.error === "not_found") {
              err = "Username " + username + " not found.";
            }
            cb(err);
          }
        });
      } //end else
    },
    /**
     * Destroys the user's session before returning
     * @param {String} sessionId The session id to use to retrieve the user for.
     * @param {Function} cb Callback function to be called after logout.
     * @return undefined
     */
    logoutBySessionId: function(sessionId, cb) {
      if (!sessionId) {
        cb && cb("Session id is required for loginBySessionId method.");
      } else {     
        // TODO: Do we need to do more here?  Some apps may wish to track log ins/outs.
        feather.server.sessionStore.get(sessionId, function(err, sess) {
          if (!err) {
            sess.user = null;
            feather.server.sessionStore.destroy(sessionId, function() {
              cb();
            });
          } else {
            cb(err);
          }
        });
      }
    },
    signup: function(options) {
      
    },
    getAuthorities: function(options) {
      
    },
    /**
     * Retrieves the user associated with the session matching the passed in sessionId.
     * If successful, the resulting user is passed into the callback function, otherwise an error is passed.
     * @param {String} sessionId The session id to use to retrieve the user for.
     * @param {Function} cb A callback function that is called with the user object as the 2nd argument if successful. If an error occurred retrieving the session, the error is passed to the callback as the first argument.
     * @return undefined
     */
    getUserBySessionId: function(sessionId, cb) {
      if (!sessionId) {
        cb && cb("Session id is required for getUserBySessionId method.");
      } else {
        feather.server.sessionStore.get(sessionId, function(err, sess) {
          if (err) {
            cb && cb(err);
          } else {
            if (sess) {
              cb && cb(null, {user: sess.user});
            } else {
              cb && cb();
            }
          }
        });
      }
    }
  });
  
  if (feather.appOptions.auth.enabled) {
    var options = Object.clone(feather.appOptions.auth);
    /**
     * @description (client & server) a singleton instance of the auth interface available to widgets.  On the server-side, this is an instance of {@link feather.auth.authInterface}.  On the client-side, it is an instance of {@link feather.auth.clientAuthInterface}.
     * @name feather.auth.api
     */
    feather.auth.api = new feather.auth.authInterface(options);
  }
}