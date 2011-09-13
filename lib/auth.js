
      //THIS IS NOT PRODUCTION READY CODE... AUTH NEEDS A RE-WORK WITH PROPER HASHING, oAuth, ETC!!

var ns = require("./ns"),
  socket = require("./socket"),
  channels = require("./channels"),
  cache = require("./simple-cache"),
  util = require("util"),
  _ = require("underscore")._;

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
 * @class represents a user object on the server.  Instances are usually stuffed in a user's session.
 * @property {String} username the user's username
 * @property {Object} profile the user's profile object, if available
 * @property {Array} authorities an array of the authorities (roles) a user has granted to them
 * @property {boolean} authenticated true if the user is logged in
 */  
var User = function(options) {
  options = options || {};
  this.username = options.username || 'anonymous';
  this.profile = options.profile || null;
  this.authorities = options.authorities || [DEFAULT_AUTHORITY];
  this.authenticated = false;
  if (options.authenticated) {
    this.authenticated = true;
  }
};


/**
 * @class manages all auth communication between client and server.  
 */
var api = exports.api = /** @lends api.prototype */ {
  /**
   * note: making this a method call to support adding other conditions in the future without requiring api changes
   * @returns {boolean} the value of "authenticated".
   */
  isLoggedIn: function(user) { 
    return user.authenticated; 
  },
  /**
   * @param {String} named the authority to test for
   * @returns {boolean} returns true if the user has the named authority
   */
  hasAuthority: function(user, named) {
    if (typeof named === "string") {
      return (user.authorities && user.authorities.indexOf(named) >= 0);
    } 
    return false;
  },
  /**
   * @param {Array} list an array of named authorities to test for
   * @returns {boolean} returns true if the user has any of the authorities in the given list
   */
  hasAnyAuthority: function(user, list) {
    for (var i = 0; i < list.length; i++) {
      if (api.hasAuthority(user, list[i])) return true;
    }
    return false;
  },
  /**
   * @param {Array} list an array of named authorities to test for
   * @returns {boolean} returns true if the user has all of the authorities in the given list
   */
  hasAllAuthorities: function(user, list) {
    for (var i = 0; i < list.length; i++) {
      if (!this.hasAuthority(user, list[i])) return false;
    }
    return true;
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

      cache.getItemsWait([
        "feather-authdb",
        "feather-server",
        "feather-logger",
        "feather-options"
      ], function(err, cacheItems) {
        if (err) cb(err); else {
          var authdb = cacheItems["feather-authdb"],
            server = cacheItems["feather-server"],
            logger = cacheItems["feather-logger"],
            appOptions = cacheItems["feather-options"];

          authdb.get(appOptions.auth.userIdPrefix + username, function(err, dbResult) {
            if (!err) {
              if (dbResult.password === password) {
                var user = new User({
                  authenticated: true,
                  profile: dbResult.profile || {},
                  username: (dbResult.profile && dbResult.profile.username) || dbResult.username || dbResult.name,
                  authorities: resolveAuthorities(dbResult.roles || dbResult.authorities)
                });
                server.sessionStore.get(sessionId, function(err, sess) {
                  if (!err) {
                    sess.user = user;
                    server.sessionStore.set(sessionId, sess);
                    cb(null, {user: user});
                  } else {
                    cb(err);
                  }
                });
              } else {
                logger.warn("Invalid login attempt for username '" + username + "'");
                cb("Invalid username/password");
              }
            } else {
              if (err.error && err.error === "not_found") {
                err = "Username " + username + " not found.";
              }
              cb(err);
            }
          });
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
      cache.getItemsWait([
        "feather-server",
        "feather-logger"
      ], function(err, cacheItems) {
        if (err) cb(err); else {
          var server = cacheItems["feather-server"],
            logger = cacheItems["feather-logger"];
      
          server.sessionStore.get(sessionId, function(err, sess) {
            if (err) cb(err); else {
              server.sessionStore.destroy(sessionId, function() {
                //after destroying the existing session, generate and store a new one, and pass the new sid back to the client
                var dummyReq = {headers:{}};
                server.sessionStore.generate(dummyReq); 
                server.sessionStore.set(dummyReq.session.id, dummyReq.session);
                logger.info("new session ID = " + dummyReq.session.id);             
                cb(null, dummyReq.session);
              });
            }
          });
        }
      });
    }
  },
  /**
   * Not implemented.
   */
   signup: function(options) {
     
   },
  /**
   * Not implemented.
   */
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
      cb("Session id is required for getUserBySessionId method.");
    } else {
      cache.getItemsWait([
        "feather-server"
      ], function(err, cacheItems) {
        if (err) cb(err); else {
          var server = cacheItems["feather-server"];

          server.sessionStore.get(sessionId, function(err, sess) {
            if (err) cb(err); else {
              if (sess) {
                cb(null, {user: sess.user});
              } else {
                cb();
              }
            }
          });
        }
      });
    }
  }
};

// var authChannel = channels.addChannel({
//   id: "feather:auth",
//   messages: ["login", "getUser", "logout"],
//   announceConnections: false,
//   hooks: {
//     message: function(args, cb) {
//       //this channel won't propagate messages, it's just used for internal messaging

//     }
//   }
// });

//TODO: migrate these handlers to proper channels implementation (preferably via flight services)

cache.getItemsWait([
  "feather-logger"
], function(err, cacheItems) {
  if (err) throw err;
  
  var logger = cacheItems["feather-logger"];

  // initialize event listeners
  socket.on("auth:login", function(args) {
    var eventArgs = args.message.data.eventArgs;
    api.loginBySessionId(args.message.sid, eventArgs.username, eventArgs.password, function(err, loginResult) {
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

  socket.on("auth:getUser", function(args) {
    api.getUserBySessionId(args.message.sid, function(err, getUserResult) {
      var result = {success: true};
      if (err || !getUserResult || !getUserResult.user) {
        result.success = false;
        result.err = err || "No user found.";
        logger.trace("user err: " + result.err);
      } else {
        result.user = getUserResult.user;
        logger.trace("user: " + util.inspect(getUserResult));            
      }
      args.result.eventArgs = result;
      args.client.send(args.result);          
    });
  });

  socket.on("auth:logout", function(args) {
    api.logoutBySessionId(args.message.sid, function(err, sid) {
      var result = {success: true, result: sid};
      if (err) {
        result.success = false;
        result.err = err;
      }
      args.result.eventArgs = result;
      args.client.send(args.result); 
    });
  });
});
