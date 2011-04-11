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
      // The auth is an object (such as a lease).  Resolve it into a string "role".
      // If it is a lease, validate the lease (expiration etc.).  If the lease is 
      // still valid, push the name onto the list.
    }
  }
  
  return outAuths;
}

function result() {
  this.err = null;
  this.data = null;
}

exports.init = function(appOptions) {
  jojo.logger.trace("auth.init");
  jojo.ns("jojo.auth");
  
  jojo.auth.userClass = Class.create({
    username: 'anonymous',
    profile: null,
    authorities: [DEFAULT_AUTHORITY],
    authenticated: false,
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
    },
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
  
  jojo.auth.authInterface = Class.create(jojo.event.eventPublisher, {
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
        debugger;
        if (!err) {
          //var hashedPass = jojo.auth.hash(dbResult.password); // TODO: Assumes passwords are stored unhashed (plain) in db, which is probably wrong.
          if (dbResult.password === options.password) {
            var user = new jojo.auth.userClass({
              authenticated: true,
              profile: dbResult.profile || {},
              username: dbResult.profile.username || dbResult.username || dbResult.name,
              authorities: resolveAuthorities(dbResult.roles || dbResult.authorities, options)
            });
            loginResult.data = user;
            jojo.server.sessionStore.get(options.message.sid, function(err, sess) {
              sess.user = user;
              jojo.server.sessionStore.set(options.message.sid, sess);
            });
          } else {
            jojo.logger
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
    logout: function(options) {
      // TODO: Do we need to do more here?  Some apps may wish to track log ins/outs.
      jojo.request.session && delete jojo.request.session.user;
      client.send(options.result);
    },
    signup: function(options) {
      
    },
    getAuthorities: function(options) {
      
    },
    getUserObject: function(options, callback) {
      if (! options.message || ! options.message.sid) {
        return null;
      }
      jojo.server.sessionStore.get(options.message.sid, function(err, sess) {
        callback && callback(sess.user);
      });
    },
  });
  
  if (jojo.appOptions.auth.enabled) {
    var options = Object.clone(jojo.appOptions.auth);
    jojo.auth.api = new jojo.auth.authInterface(options);
    
  }
}