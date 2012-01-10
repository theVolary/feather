var sys           = require("sys"),
  http            = require("http"),
  fs              = require("fs"),
  Connect         = require("connect"),
  cache           = require("./simple-cache"),
  EventPublisher  = require("./event-publisher"),
  parser          = require("./parser"),
  _               = require("underscore")._,
  connectRouter   = require("./router_connect"),
  querystring     = require("querystring"),
  ajaxProxy       = require("./ajaxProxy"),
  Rest            = require("./rest");
  
/**
 * @name Router
 * @class Provides the router for the feather framework
 */   
   
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
    "feather-options"
  ], function(err, cacheItems) {
    if (err) cb(err); else {
      var appOptions = cacheItems["feather-options"],
        logger = cacheItems["feather-logger"],
        resourceCaches = cacheItems["feather-resourcePublishers"],
        files = cacheItems["feather-files"];

      //cache auth rules RegExp instances
      if (appOptions.auth.rules) {
        for (var expression in appOptions.auth.rules) {
          var authRule = appOptions.auth.rules[expression];
          authRule.regex = new RegExp(expression);
        }
      }

      var createRestEndPoint = function(routeFn) {
        return function(req, res, next) {
          if (req.url.indexOf('?') > -1) {
            var qsObj = querystring.parse(req.url.split('?')[1]);
            req.query = qsObj;
          }
          routeFn(req, res, function(err, result) {
            if (err) {
              res.writeHead(500, {'Content-Type': 'application/json'});
              res.end(JSON.stringify(err));
            } else if (result === null || result === undefined) {
              res.writeHead(404, {'Content-Type': 'text/plain'});
              res.end("Document not found");
            } else {
              res.writeHead(200, {'Content-Type': 'application/json'});
              res.end(JSON.stringify(result));
            }
          });
        };
      };

      var registerRestRoutesForVerb = function(app, api, verb, basePath) {
        if (api[verb]) {
          _.each(_.keys(api[verb]), function(route) {
            app[verb](basePath + route, createRestEndPoint(api[verb][route]));
          });
        }
      };

      var router = { //default router
        path: "/",
        registerRestRoute: function(baseRoutePath, route, routeFn, cb) {
          var fullRoutePath = "/_rest/" + baseRoutePath + route;
          this.app[verb](fullRoutePath, createRestEndPoint(routeFn));
          cb(null);
        },
        router: connectRouter(function(app) {
          //special-case routes first (mainly used for white-listing the serving of resources that live outside of /public)
          app.get(/^\/(feather-client)\/(.*)/, function(req, res, next) {
            var path = options.featherRoot + "/" + req.params[0] +"/" + req.params[1];
            Connect.static.send(req, res, next, {path: path});
          });
          
          //if the app is configured to use AJAX instead of socket.io for system requests, hook up that route
          if (appOptions.useAjaxForSystem) {
            app.post("/_ajax/", ajaxProxy);
          }

          //if any REST apis are defined for this app, include those routes here
          if (files.restFiles && files.restFiles.length > 0) {
            _.each(files.restFiles, function(fileName) {
              var base = fileName.split(".")[0];
              var api = require(appOptions.appRoot + "/rest/" + fileName);
              _.each(connectRouter.methods, function(verb) {
                registerRestRoutesForVerb(app, api, verb, "/_rest/" + base);
              });
            });
          }

          // set up the consumable rest api.  This will get simple-cached and get sucked into feather.rest when the server init calls back (successfully).
          // Should we do it this way, or set up a separate router for dynamic rest calls that takes priority over this one?
          var rest = new Rest(app);

          /**
           * non-special-case routes (.feather.html or static resources that live in /public) 
           * @param {Object} req
           * @param {Object} res
           * @param {Object} next
           */
          var pendingParses = {};

          var handleFeatherReq = function(req, res, next) {
            var redirect = false;
            //first, apply auth rules to the url
            if (appOptions.auth.rules) {
              for (var expression in appOptions.auth.rules) {
                var authRule = appOptions.auth.rules[expression];
                if (req.url.match(authRule.regex)) {
                  if (authRule.loginRequired && authRule.redirectUrl) {
                    //TODO: allow role checking here as well
                    if (!req.session || !req.session.user) {
                      req.url = authRule.redirectUrl;
                      redirect = true;
                      next();
                      break;
                    }
                  }
                }
              }
            }

            if (!redirect) {
              var page = req.params[0];
              if (!page) {
                //root request, use "index"
                page = "index";
              }
              if (page.lastIndexOf("/") == page.length - 1) {
                page += "index";
              }
              if (page.indexOf(".") == -1) {
                page += ".feather.html";
              }
              
              req.page = page;
              
              //blacklisting for widget .server.js files
              if (page.indexOf(".server.js") > -1) {
                return forbidden(res);
              }

              //try to find a .feather file that matches
              var path = options.publicRoot + "/" + page;

              if (files.featherFiles[path]) {
                var featherFile = files.featherFiles[path];
                var cb = function(html) {
                  res.writeHead(200, {'Content-Type': 'text/html'});
                  res.end(html);
                };

                //parse the file and return the resulting html
                //NOTE: feather now parses all .feather.html files at app startup, so the else
                //should never
                if (featherFile.render) {
                  featherFile.render(req, cb);
                } else {
                  var pending = pendingParses[path];
                  if (pending) {
                    pending.once("complete", function(render) {
                      render(req, cb);
                    });
                  } else {
                    pending = new EventPublisher({id: path});
                    pendingParses[path] = pending;
                    parser.parseFile({
                      path: path, 
                      request: req
                    }, function(err, render) {
                      if (err) next(err); else {
                        featherFile.render = render;
                        render(req, cb);                  
                        //let any other concurrent requests that came in during the parse know that it is now complete..
                        pending.fire("complete", render);
                        pending.dispose();
                        pendingParses[path] = null;
                      }
                    });
                  }
                }
              } else {        
                //no matching feather resource found, move on to the next middleware in the stack
                next();
              }
            }
          };

          app.get(/\/(.*)/, handleFeatherReq);

          app.post(/\/(.*)/, handleFeatherReq);
        })
      };
      cb(null, router.router);
    }
  });
};
