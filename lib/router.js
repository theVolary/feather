var http          = require("http"),
  fs              = require("fs"),
  path            = require("path"),
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
    "feather-options",
    "feather-domPool"
  ], function(err, cacheItems) {
    if (err) cb(err); else {
      var appOptions = cacheItems["feather-options"],
        logger = cacheItems["feather-logger"],
        resourceCaches = cacheItems["feather-resourcePublishers"],
        files = cacheItems["feather-files"],
        domPool = cacheItems["feather-domPool"];

      //cache auth rules RegExp instances
      if (appOptions.auth.rules) {
        for (var expression in appOptions.auth.rules) {
          var authRule = appOptions.auth.rules[expression];
          authRule.regex = new RegExp(expression);
        }
      }

      var router = connectRouter(function(app) {
        //special-case routes first (mainly used for white-listing the serving of resources that live outside of /public)
        app.get(/^\/(feather-client)\/(.*)/, function(req, res, next) {
          var path = nodePath.join(options.featherRoot, req.params[0], req.params[1]);
          send(req, path).pipe(res);
        });
        
        //if the app is configured to use AJAX instead of socket.io for system requests, hook up that route
        if (appOptions.useAjaxForSystem) {
          app.post("/_ajax/", ajaxProxy);
        }

        // set up the consumable rest api.  This will get simple-cached and get sucked into feather.rest when the server init calls back (successfully).
        // Should we do it this way, or set up a separate router for dynamic rest calls that takes priority over this one?
        var rest = new Rest(app),
        restDocs = [],
        sem = new Semaphore(function() {
          if (appOptions.rest.docs.enabled && appOptions.rest.docs.consolidated) {
            domPool.getResource(function(dom) {
              fs.readFile(__dirname + '/docTemplates/rest.html', function(err, data) {
                if(err) {
                  logger.error({message: err, exception: err, category: "feather.srvr"});
                } else {
                  logger.info("Rendering " + restDocs.length + " rest docs into consolidated route.");
                  dom.document.innerHTML =  data.toString();
                  _.each(restDocs, function(rd) {
                    dom.$('#doc-container').append(rd);
                  });
                  var finalHtml = dom.document.innerHTML;
                  domPool.release(dom);
                  app.get("/_rest/_doc/", function(req, res, next) {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(finalHtml);
                  });
                  logger.info("Done!");
                }
              });
            });
          }
        });

        //if any REST apis are defined for this app, include those routes here
        if (files.restFiles && files.restFiles.length > 0) {
          _.each(files.restFiles, function(fileName) {
            var base = path.basename(fileName, '.js');
            var restDocPath = "";
            var api = require(nodePath.join(appOptions.appRoot, "rest", fileName));
            _.each(_.keys(api), function(verb) {
              _.each(_.keys(api[verb]), function(route) {
                rest.registerRoute(verb, base + route, api[verb][route], function(err) {
                  if (err) throw new Error(err);
                });
              });
            });

            // if rest documentation is desired, set up those routes too.
            if (appOptions.rest.docs.enabled) {
              restDocPath = appOptions.publicRoot + "/feather-res-cache/_rest/" + base + ".html";
              fs.exists(restDocPath, function(exists) {
                if (exists) {
                  logger.trace({message: "Enabling docs for " + restDocPath, category: "feather.rest"});
                  fs.readFile(restDocPath, "utf8", function(err, docData) {
                    app.get("/_rest/_doc/" + base, function(req, res, next) {
                      res.writeHead(200, {'Content-Type': 'text/html'});
                      res.end(docData);
                    });
                    
                    if (appOptions.rest.docs.consolidated) {
                      sem.increment();
                      domPool.getResource(function(dom) {
                        dom.document.innerHTML = docData;
                        restDocs.push(dom.$('#doc-container').html());
                        domPool.release(dom);
                        sem.execute();
                      });
                    }
                  });
                }
              });
            }
          });

          //asldkfj
        }

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
                    //if we _do_ have a session but just no user... store requested url for redirection after auth takes place
                    if (req.session) {
                      req.session.requestedUrl = req.url;
                    }
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
            var path = nodePath.join(options.publicRoot, page);

            if (files.featherFiles[path]) {
              //TODO: for now, hardcoding the feather-res-cache path prefix, but at some point we probably want to make that configurable...              
              var publishedPath = nodePath.join(options.publicRoot, "feather-res-cache", page);
              send(req, publishedPath).pipe(res);
            } else {        
              //no matching feather resource found, move on to the next middleware in the stack
              next();
            }
          }
        };

        app.get(/\/(.*)/, handleFeatherReq);

        app.post(/\/(.*)/, handleFeatherReq);

        //escape the stack with the router and its rest handler if present
        process.nextTick(function() {
          cb(null, router, rest);
        });        
      });
    }
  });
};
