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
      return (this.authorities && this.authorities.indexOf(named) >= 0);
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
      
      // initialize event listeners
      jojo.socket.on("auth:login", function(args) {
        var options = Object.extend({}, args.message.data.eventArgs);
        options.client = args.client;
        options.result = args.result;
        options.result.eventArgs = new result();
        this.login(options);
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
      jojo.data.authdb.get(appOptions.auth.userIdPrefix + options.username, function(err, dbResult) {
        if (!err) {
          var hashedPass = jojo.auth.hash(dbResult.password); // TODO: Assumes passwords are stored unhashed (plain) in db, which is probably wrong.
          if (hashedPass === options.password) {
            var user = new jojo.auth.userClass({
              profile: dbResult.profile || {},
              username: dbResult.profile.username || dbResult.username || dbResult.name,
              authorities: resolveAuthorities(dbResult.authorities, options)
            });
            loginResult.data = user;
            jojo.request.session.user = user;
          } else {
            loginResult.err = "Invalid username/password";
          }
        } else {
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
    getUserObject: function() {
      return new jojo.auth.userInterface();
    },
  });
  
  if (appOptions.auth.enabled) {
    var options = Object.extend({}, appOptions.auth);
    jojo.auth.api = new jojo.auth.authInterface(options);
    
  }
}