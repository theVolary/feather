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

exports.init = function(appOptions) {
  jojo.logger.trace("auth.init");
  jojo.ns("jojo.data.auth");
  
  require("jojojs-client/auth-shared"); // Initialize the client-side user interface definition.  Stored on jojo.data.userInterface.
  
  jojo.data.auth.authInterface = Class.create(jojo.event.eventPublisher, {
    initialize: function($super, options) {
      $super(options);
    },
    login: function(options) {
      jojo.data.authdb.get(appOptions.auth.userIdPrefix + options.username, function(err, dbResult) {
        if (!err) {
          var hashedPass = jojo.data.auth.hash(dbResult.password); // TODO: Assumes passwords are stored unhashed (plain) in db, which is probably wrong.
          if (hashedPass === options.password) {
            options.result.result = {
              profile: dbResult.profile,
              username: dbResult.profile.username,
              authorities: resolveAuthorities(dbResult.authorities, options)
            };
            options.result.success = true;
          } else {
            options.result.err = "Invalid username/password";
          }
        } else {
          options.result.err = err;
        }
        client.send(options.result);
      });
    },
    logout: function(options) {
      // TODO: Do we need to do more here?  Some apps may wish to track log ins/outs.
      options.result.success = true;
      client.send(options.result);
    },
    signup: function(options) {
      
    },
    getAuthorities: function(options) {
      
    },
    getUserObject: function() {
      return new jojo.data.userInterface();
    },
  });
  
  if (appOptions.auth.enabled) {
    var options = Object.extend({}, appOptions.auth);
    jojo.data.auth.api = new jojo.data.auth.authInterface(options);
    
  }
}