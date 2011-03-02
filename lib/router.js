var sys = require("sys"),
  http = require("http"),
  fs = require("fs"),
  Connect = require("connect"),
  parser = require("./parser");

exports.init = function(options) {   
  var router = { //default router
    path: "/",
    router: Connect.router(function(app) { 
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
