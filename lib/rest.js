var _           = require("underscore")._;
    queryString = require("querystring"),
    cache       = require("./simple-cache"),
    connectRouter   = require("./router_connect"),
    Registry    = require("./registry"),
    nodePath    = require('path');

var createRestHandler = function(restFn, cb) {
  var handler = function(req, res, next) {
    if (req.url.indexOf('?') > -1) {
      req.query = queryString.parse(req.url.split('?')[1]);
    }

    restFn(req, res, function(err, result) {
      if (err) {
        res.statusCode = err.statusCode || 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end(JSON.stringify(err));
      } else if (_.isNull(result) || _.isUndefined(result)) {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end(JSON.stringify("Document not found"));
      } else {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(result));
      }
    });
  };
  cb && cb(null, handler); // callback for async-style coding
  return handler; // nothing async here, so also return result fn.

}; // end createRestHandler

// public api
var restApi = function(middlewareContainer) {
  var me = this;
  me.app = middlewareContainer;
  me.routes = new Registry();
  me.logger = null;
  cache.getItemsWait(["feather-logger"], function(err, cacheItems) {
    me.logger = cacheItems["feather-logger"];
  });
};

restApi.prototype = {
  registerRoute: function(verb, routePath, routeFn, cb) {
    var fullRoutePath = "/_rest/" + routePath.replace(/^\//, ''),
      key = verb + routePath,
      me = this;

    if (!me.routes.findById(key)) {
      me.routes.add({ id: key, verb: verb, route: routePath, fn: routeFn });
      me.logger.trace({message: "Registering rest path " + fullRoutePath + " for verb " + verb, category: "feather.rest"});
      me.app[verb](fullRoutePath, createRestHandler(routeFn));
      cb && cb(null);
    } else {
      cb && cb("Route already exists for that verb");
    }
  },
  dispose: function() {
    this.routes.dispose();
  }
};

exports.getMiddleware = function(options, files) {
  // set up the consumable rest api.
  var router = connectRouter(function(app) {

    var rest = new restApi(app);

    _.each(files, function(fileName) {
      var base = nodePath.basename(fileName, '.js');
      var restDocPath = "";
      var api = require(nodePath.join(options.appRoot, "rest", fileName));
      _.each(_.keys(api), function(verb) {
        _.each(_.keys(api[verb]), function(route) {
          rest.registerRoute(verb, base + route, api[verb][route], function(err) {
            if (err) throw new Error(err);
          });
        });
      });
    }); 
  });
  
  return router;
};