var _           = require("underscore")._;
    queryString = require("querystring"),
    cache       = require("./simple-cache"),
    Registry    = require("./registry");

var createRestHandler = function(restFn, cb) {
  var handler = function(req, res, next) {
    if (req.url.indexOf('?') > -1) {
      req.query = queryString.parse(req.url.split('?')[1]);
    }

    restFn(req, res, function(err, result) {
      if (err) {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(err));
      } else if (_.isNull(result) || _.isUndefined(result)) {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end("Document not found");
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
var restApi = module.exports = function(middlewareContainer) {
  this.app = middlewareContainer;
  this.routes = new Registry();
};

restApi.prototype = {
  registerRoute: function(verb, routePath, routeFn, cb) {
    var fullRoutePath = "/_rest" + routePath,
      key = verb + routePath,
      me = this;

    if (!me.routes.findById(key)) {
      me.routes.add({ id: key, verb: verb, route: routePath, fn: routeFn });
      console.trace("Registering rest path " + fullRoutePath + " for verb " + verb);
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