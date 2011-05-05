var sys = require("sys"),
  http = require("http"),
  fs = require("fs"),
  Connect = require("connect");
  
  
/**
 * Respond with 403 "Forbidden".
 */
function forbidden(res) {
  var body = 'Forbidden';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', body.length);
  res.statusCode = 403;
  res.end(body);
}  

/**
 * Respond with 404 "Not Found".
 */
function notFound(res) {
  var body = 'Not Found';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', body.length);
  res.statusCode = 404;
  res.end(body);
}  

exports.init = function(options) {   
  var router = { //default router
    path: "/",
    router: Connect.router(function(app) {
      
      //special-case routes first (mainly used for white-listing the serving of resources that live outside of /public)
      app.get(/^\/(feather-client|socket.io.client)\/(.*)/, function(req, res, next) {
        var path = feather.appOptions.featherRoot + "/" + req.params[0] +"/" + req.params[1];
        Connect.static.send(req, res, next, {path: path});
      });
      
      /**
       * "/feathercss/" and "/featherjs/" based paths are reserved for widget level resources
       * "/featherresource/" based paths are for packages created via the generic resource packager
       */
      app.get(/^\/featherresource\/(.*)$/, function(req, res, next) {
        var cacheKey = req.params[0]; 
        var cache = feather.resourceCaches.findById(cacheKey);
        if (!cache) {
          feather.logger.error("Could not find resource cache for key " + cacheKey);
          return notFound(res);
        }
        return cache.serveContent(res);
      });
      
      /**
       * non-special-case routes (.feather.html or static resources that live in /public) 
       * @param {Object} req
       * @param {Object} res
       * @param {Object} next
       */
      var pendingParses = {};

      app.get(/\/(.*)/, function(req, res, next) {
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
        var path = feather.appOptions.publicRoot + "/" + page;
		    if (feather.featherFiles[path]) {
          var featherFile = feather.featherFiles[path];
          req.suppress(["data", "end"], true); //required any time async ops are performed in main req/res loop
          var cb = function(html) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(html);
            //re-roll request events
            req.unsuppress();
          };
          //parse the file and return the resulting html
          if (featherFile.render) {
            featherFile.render(req, cb);
          } else {
            var pending = pendingParses[path];
            if (pending) {
              pending.once("complete", function(args) {
                args.render(req, cb);
              });
            } else {
              pending = new feather.event.eventPublisher({id: path});
              pendingParses[path] = pending;
              feather.parser.parseFile(path, {
                request: req,
                callback: function(render) {
                  featherFile.render = render;
                  render(req, cb);                  
                  //let any other concurrent requests that came in during the parse know that it is now complete..
                  pending.fire("complete", {render: render});
                  pendingParses[path] = null;
                }
              });
            }
          }
        } else {        
          //no matching feather resource found, move on to the next middleware in the stack
          next();
        }
      });
    })
  };
  if (options && options.routers) {
    feather.routers = options.routers;
    feather.routers.unshift(router);
  } else {
    feather.routers = [router];
  }
};
