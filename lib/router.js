var sys = require("sys"),
  http = require("http"),
  fs = require("fs"),
  Connect = require("connect"),
  parser = require("./parser");
  
  
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

exports.init = function(options) {   
  var router = { //default router
    path: "/",
    router: Connect.router(function(app) {
      
      //special-case routes first (mainly used for white-listing the serving of resources that live outside of /public)
      app.get(/^\/(jojojs-client|socket.io.client)\/(.*)/, function(req, res, next) {
        var path = "./jojolib/" + req.params[0] +"/" + req.params[1];
        Connect.static.send(req, res, next, {path: path});
      });
      
      //non-special-case routes (.jojo or static resources that live in /public) 
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
          page += ".jojo";
        }
        
        //blacklisting (if jojolib based paths are requested and not explicitly whitelisted above)
        //also... blacklisting for widget .server.js files
        if (page.indexOf(".server.js") > -1) {
          return forbidden(res);
        }
        
        //try to find a .jojo file that matches
        var path = jojo.appOptions.publicRoot + "/" + page;
        if (jojo.jojoFiles[path]) {
          var jojoFile = jojo.jojoFiles[path];
          var cb = function(html) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(html);
          };
          //parse the file and return the resulting html
          if (jojoFile.html) {
            cb(jojoFile.html);
          } else {
            req.suppress(["data", "end"], true); //required any time async ops are performed in main req/res loop
            parser.parse(path, {
              request: req,
              callback: function(html) { 
                jojoFile.html = html;
                cb(html);
                //now, if this file changes on disk, invalidate parsed html for future requests
                jojo.event.eventDispatcher.once("filechange:" + path, function(args) {
                  delete jojoFile.html;
                });
                //re-roll request events
                req.unsuppress(); 
              }
            })
          }
        } else {        
          //no matching jojo resource found, move on to the next middleware in the stack
          next(true);
        }
      });
    })
  };
  if (options && options.routers) {
    jojo.routers = options.routers;
    jojo.routers.unshift(router);
  } else {
    jojo.routers = [router];
  }
};
