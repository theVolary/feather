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

/**
 * @name jojo.auth.resultClass
 * @description result object created when passing results back to the client
 * @property {Object} err if not null, the operation encountered an error
 * @property {Object} data the resulting data of the operation
 */
function result() {
  this.err = null;
  this.data = null;
}

exports.init = function(appOptions) {
  jojo.logger.trace("auth.init");
  jojo.ns("jojo.auth");

  /**
   * @class represents a user object on the server.  Instances are usually stuffed in a user's session.
   * @property {String} username the user's username
   * @property {Object} profile the user's profile object, if available
   * @property {Array} authorities an array of the authorities (roles) a user has granted to them
   * @property {boolean} authenticated true if the user is logged in
   */  
  jojo.auth.userClass = Class.create(/** @lends jojo.auth.userClass.prototype */{
    username: 'anonymous',
    profile: null,
    authorities: [DEFAULT_AUTHORITY],
    authenticated: false,
    
    /**
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
    },
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
    }
  });
  
  /**
   * @class manages all auth communication between client and server.  Listens to socket sysChannel events prefixed with "auth:".  Do NOT create instances of this class.  A singleton is managed for you by the framework {@link jojo.auth.api}.
   */
  jojo.auth.authInterface = Class.create(jojo.event.eventPublisher, /** @lends jojo.auth.authInterface.prototype */{
    /** @constructs */
    initialize: function($super, options) {
      $super(options);
      var me = this;
      
      // initialize event listeners
      jojo.socket.on("auth:login", function(args) {
        var options = Object.extend({}, args.message.data.eventArgs);
        options.client = args.client;
        options.result = args.result;
        options.result.eventArgs = new result();
        options.message = args.message;
        me.login(options);
      });
      
      jojo.socket.on("auth:getUser", function(args) {
        var user = me.getUserObject(args, function(user) {
          args.result.eventArgs = user;
          args.client.send(args.result);          
        });
      });
    },
    /**
     * @param {Object} options contains: result, client, username, password
     * @returns undefined.  Result {@link jojo.auth.userClass} is passed directly to client as the data property of the {@link jojo.auth.resultClass} class via the client object (web socket)
     */
    login: function(options) {
      var clientResult = options.result;
      var loginResult = clientResult.eventArgs;
      
      if (!options.username || ! options.password) {
        loginResult.err = "No username or password submitted.";
        options.client.send(clientResult);
        return;
      }
      jojo.logger.debug({message: "Getting user ${prefix}${user}", replacements:{prefix:jojo.appOptions.auth.userIdPrefix, user:options.username}, category:'jojo.auth'});
      jojo.data.authdb.get(jojo.appOptions.auth.userIdPrefix + options.username, function(err, dbResult) {
        if (!err) {
          //var hashedPass = jojo.auth.hash(dbResult.password); // TODO: Assumes passwords are stored unhashed (plain) in db, which is probably wrong.
          if (dbResult.password === options.password) {
            var user = new jojo.auth.userClass({
              authenticated: true,
              profile: dbResult.profile || {},
              username: (dbResult.profile && dbResult.profile.username) || dbResult.username || dbResult.name,
              authorities: resolveAuthorities(dbResult.roles || dbResult.authorities, options)
            });
            loginResult.data = user;
            jojo.server.sessionStore.get(options.message.sid, function(err, sess) {
              sess.user = user;
              jojo.server.sessionStore.set(options.message.sid, sess);
            });
          } else {
            jojo.logger.warn("Invalid login attempt for username '" + options.username + "'");
            loginResult.err = "Invalid username/password";
          }
        } else {
          if (err.error && err.error === "not_found") {
            err = "Username " + options.username + " not found.";
          }
          loginResult.err = err;
        }
        options.client.send(clientResult);
      });
    },
    /**
     * Destroys the user's session before returning
     * @param {Object} options contains: result, client.
     * @return undefined
     */
    logout: function(options) {
      // TODO: Do we need to do more here?  Some apps may wish to track log ins/outs.
      jojo.request.session && jojo.request.session.destroy();
      options.client.send(options.result);
    },
    signup: function(options) {
      
    },
    getAuthorities: function(options) {
      
    },
    /**
     * Retrieves the current session's user object and returns it via the given callback method
     * @param {Object} options contains: message
     * @param callback function that is called with the user object as its only parameter.  The parameter is null if an error occurred retrieving the session.
     */
    getUserObject: function(options, callback) {
      if (! options.message || ! options.message.sid) {
        return null;
      }
      jojo.server.sessionStore.get(options.message.sid, function(err, sess) {
        if (err) {
          // TODO: log the error
          callback && callback(null);
        } else {
          callback && callback(sess.user);
        }
      });
    },
  });
  
  if (jojo.appOptions.auth.enabled) {
    var options = Object.clone(jojo.appOptions.auth);
    /**
     * @description (client & server) a singleton instance of the auth interface available to widgets.  On the server-side, this is an instance of {@link jojo.auth.authInterface}.  On the client-side, it is an instance of {@link jojo.auth.clientAuthInterface}.
     * @name jojo.auth.api
     */
    jojo.auth.api = new jojo.auth.authInterface(options);
  }
}