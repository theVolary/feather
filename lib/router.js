var sys = require("sys"),
    http = require("http"),
    fs = require("fs"),
    Connect = require("./connect/lib/connect/index");

exports.init = function(jojo, options) {
    var router = { //default router
        path: "/",
        router: Connect.router(function(app) { 
            app.get(/\/(.*)/, function(req, res, params, next) {
                params.page = params.splat[0];
                if (!params.page) {
                    //root request, use "index"
                    params.page = "index";
                }
                if (params.page.lastIndexOf("/") == params.page.length - 1) {
                    params.page = params.page + "index";
                }
                //logging
                sys.puts("router page: " + params.page);
                
                //first try to find a .jojo or .html file that matches
                
                
                //no matching jojo resource found, move on to the next middleware in the stack
                next(true);
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
