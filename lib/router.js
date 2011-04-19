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
        var path = "./featherlib/" + req.params[0] +"/" + req.params[1];
        Connect.static.send(req, res, next, {path: path});
      });
      
      /**
       * "/feathercss/" and "/featherjs/" based paths are reserved for widget level resources
       * "/featherresource/" based paths are for packages created via the generic resource packager
       */
      app.get(/^\/feather(css|js|resource)\/(.*)$/, function(req, res, next) {
        var typeHandler = {
          cache : null,
          type : req.params[0],
          contentType : 'text/plain'
        };
        var cacheKey = req.params[1];
        switch (typeHandler.type) {
          case "js":
            typeHandler.cache = feather.widgetClientFiles;
            typeHandler.contentType = "text/javascript";
            break;
          case "css":
            typeHandler.cache = feather.cssFiles;
            typeHandler.contentType = "text/css";
            break;
          case "resource":
            var cache = feather.resourceCaches.findById(cacheKey);
            if (!cache) {
              return notFound(res);
            }
            return cache.serveContent(res);
          default: 
            break;
        }
        
        /**
         * we only reach this point for widget level resources
         */
        if (typeHandler.cache[cacheKey]) {
          
          res.setHeader('Content-Type', typeHandler.contentType);
          res.setHeader('Content-Length', typeHandler.cache[cacheKey].body.length);
          res.statusCode = 200;
          res.end(typeHandler.cache[cacheKey].body);
          
        } else {
          sys.puts("No cached " + typeHandler.type + " file for " + cacheKey);
        }
      });
      
      // Inject special url mappers here.
      
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
        
        feather.request.page = page;
        
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
            featherFile.render(cb);
          } else {
            var pending = pendingParses[path];
            if (pending) {
              pending.once("complete", function(args) {
                args.render(cb);
              });
            } else {
              pending = new feather.event.eventPublisher({id: path});
              pendingParses[path] = pending;
              feather.parser.parseFile(path, {
                request: req,
                callback: function(render) {
                  featherFile.render = render;
                  render(cb);
                  //now, if this file changes on disk, invalidate parsed html for future requests
                  feather.event.eventDispatcher.once("filechange:" + path, function(args) {
                    if (args.prev.mtime.getTime() != args.curr.mtime.getTime()) {
                      sys.puts("feather file " + path + " changed! " + args.prev.mtime.getTime() + ' / ' + args.curr.mtime.getTime());
                      featherFile.render = null;
                    }
                  });
                  //let any other concurrent requests that came in during the parse know that it is now complete..
                  pending.fire("complete", {render: render});
                  pendingParses[path] = null;
                }
              });
            }
          }
        } else {        
          //no matching feather resource found, move on to the next middleware in the stack
          next(true);
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
