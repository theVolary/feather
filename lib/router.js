var http          = require("http"),
  fs              = require("fs"),
  Connect         = require("connect"),
  cache           = require("./simple-cache"),
  EventPublisher  = require("./event-publisher"),
  parser          = require("./parser"),
  _               = require("underscore")._,
  connectRouter   = require("./router_connect"),
  querystring     = require("querystring"),
  ajaxProxy       = require("./ajaxProxy"),
  Rest            = require("./rest"),
  nodePath        = require("path"),
  send            = require("send"),
  Semaphore       = require("./semaphore");
  
/**
 * @name Router
 * @class Provides the router for the feather framework
 */   
   
/*
 * Respond with 401 "Unauthorized".
 */
function unauthorized(res) {
  var body = 'Unauthorized';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', body.length);
  res.statusCode = 401;
  res.end(body);
}  

/*
 * Respond with 403 "Forbidden".
 */
function forbidden(res) {
  var body = 'Forbidden';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', body.length);
  res.statusCode = 403;
  res.end(body);
}  

/*
 * Respond with 404 "Not Found".
 */
function notFound(res) {
  var body = 'Not Found';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', body.length);
  res.statusCode = 404;
  res.end(body);
}  

//if the app doesn't define a custom authorize function for routes, use this one to authorize all routes
function noopAuthorize(req, res, authorized, _unauthorized) {
  authorized();
};

/**
 * @memberOf Router
 * @function
 * @param {Object} options
 * @param {Function} cb called upon completion.  The function is passed an error (or null), and a Connect.router instance.
 */
var getRouter = exports.getRouter = function(options, cb) {
  cache.getItemsWait([
    "feather-resourcePublishers",
    "feather-logger",
    "feather-files",
    "feather-options",
    "feather-domPool"
  ], function(err, cacheItems) {
    if (err) cb(err); else {
      var appOptions = cacheItems["feather-options"],
        logger = cacheItems["feather-logger"],
        resourceCaches = cacheItems["feather-resourcePublishers"],
        files = cacheItems["feather-files"],
        domPool = cacheItems["feather-domPool"];

      //normalize authorize function
      options.authorize = options.authorize || noopAuthorize;

      //cache auth rules RegExp instances
      if (appOptions.auth.rules) {
        for (var expression in appOptions.auth.rules) {
          var authRule = appOptions.auth.rules[expression];
          authRule.regex = new RegExp(expression);
          authRule.expression = expression;
        }
      }

      var router = connectRouter(function(app) {
        //special-case routes first (mainly used for white-listing the serving of resources that live outside of /public)
        app.get(/^\/(feather-client)\/(.*)/, function(req, res, next) {
          var _path = nodePath.join(options.featherRoot, req.params[0], req.params[1]);
          send(req, _path).pipe(res);
        });
        
        //if the app is configured to use AJAX instead of socket.io for system requests, hook up that route
        if (appOptions.useAjaxForSystem) {
          app.post("/_ajax/", ajaxProxy);
        }        

        /**
         * non-special-case routes (.feather.html or static resources that live in /public) 
         * @param {Object} req
         * @param {Object} res
         * @param {Object} next
         */

        var handleFeatherReq = function(req, res, next) {

          var completeRequest = function() {
            //if we got here, auth&auth passed...

            //blacklisting for widget .server.js files
            if (req.url.indexOf(".server.js") > -1) { //NOTE: req.page gets set in middleware prior to this router
              return forbidden(res);
            }
            
            if (req.isFeatherPage) {
              //TODO: for now, hardcoding the feather-res-cache path prefix, but at some point we probably want to make that configurable...              
              var publishedPath = nodePath.join(options.publicRoot, "feather-res-cache", req.page);
              send(req, publishedPath).pipe(res);
            } else {        
              //no matching feather resource found, move on to the next middleware in the stack
              next();
            }
          };

          //first, apply auth rules to the url
          if (appOptions.auth.rules) {
            for (var expression in appOptions.auth.rules) {
              var authRule = appOptions.auth.rules[expression];

              if (req.url.match(authRule.regex)) {
                if (authRule.loginRequired) {
                  //TODO: allow role checking here as well
                  if (!req.session || !req.session.user) {
                    if (authRule.redirectUrl) {
                      //if we _do_ have a session but just no user... store requested url for redirection after auth takes place
                      if (req.session) {
                        req.session.requestedUrl = req.url;
                      }
                      req.url = authRule.redirectUrl;
                      return next();
                    } else {
                      return unauthorized(res);
                    }
                  }

                  //authentication passed, now allow app to authorize the request
                  if (authRule.authorizeRequired) {
                    req.authRule = authRule;
                    return options.authorize(req, res, 
                      completeRequest,

                      //the error/unauthorized case...
                      function(err) {
                        logger.warn({category: 'auth', message: 'unauthorized access attempt; url: ' + req.url + '; app auth error message: ' + (err || 'no_error_message_provided')});
                        
                        if (authRule.redirectUrlUnauthorized) {
                          //send the user back to redirectUrlUnauthorized
                          req.url = authRule.redirectUrlUnauthorized;
                          delete req.isFeatherPage;
                          return next();
                        }

                        //no app configured redirect URL, just return a 403
                        return forbidden(res);
                      }
                    );
                  } else {
                    completeRequest();
                  }
                }
              }
            }

            //no matching rule found, just complete the request
            completeRequest();
          } else {
            completeRequest();
          }
        };

        app.get(/\/(.*)/, handleFeatherReq);

        app.post(/\/(.*)/, handleFeatherReq);

        process.nextTick(function() {
          cb(null, router);
        });        
      });
    }
  });
};
