var Connect = require("connect"),
    router = require("./router"),
    cache = require("./simple-cache");
    gzip = require('connect-gzip'),
    feather = require('./feather'),
    _ = require("underscore")._;

var _404error = "404 - The file you have requested could not be found.";

var emptyMiddleware = function(req, res, next) {
  next();
};

var formatRequestLog = function(req, res) {
  //':remote-addr - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
  var remoteAddr = req.socket && (req.socket.remoteAddress || (req.socket.socket && req.socket.socket.remoteAddress));
  return remoteAddr + " - - " + new Date().toUTCString() + " \"" + req.method + " " + req.originalUrl 
    + " HTTP/" + req.httpVersionMajor + "." + req.httpVersionMinor + "\" " + res.statusCode + " " 
    + (res._headers ? (res._headers["content-length"] || "") : "") + " \"" + (req.headers['referer'] || req.headers['referrer'] || "") + "\" \""
    + req.headers['user-agent'] + "\"";
};

exports.getMiddleware = function(options, cb) {
  router.getRouter(options, function(err, _router, _rest) {
    if (err) cb(err); else {      
      if(options.resources.publish.gzip){
        var staticHandler = gzip.staticGzip(options.publicRoot);
      } else {
        var staticHandler = Connect.static(options.publicRoot);
      }

      //TODO: implement app-overridable method to create the store, and supply a pre-built Couchdb session store implementation
      //TODO: change this if the result of cache.getItem ever changes to be async (right now it's sync with an async-looking interface due to 
      //planning for the potential future)
      cache.getItem("feather-sessionStore", function(err, _sessionStore) {
        if (!_sessionStore) {
          _sessionStore = new Connect.session.MemoryStore;
          cache.setItem("feather-sessionStore", _sessionStore);
        }
        options.session.config.store = _sessionStore;
      });

      var middleware = [
        Connect.cookieParser(options.connect.cookieParser.secret),
        Connect.bodyParser(),
        Connect.session(options.connect.session),
        function(req, res, next) {
          cache.getItems([
            "feather-server"
          ], function(err, cacheItems) {
            if (err) next(err); else {
              var server = cacheItems["feather-server"];

              if (!server.sessionStore) {
                server.sessionStore = req.sessionStore;
              }
              
              if (options.onRequest && typeof(options.onRequest) === 'function') {
                options.onRequest(feather, req, res, next);
              }
              
              next();
            }
          });
        },
        _router,
        //a redirect handler in case the router changes the url
        function(req, res, next) {
          if (req.url !== req.originalUrl) {
            //do the redirect
            res.statusCode = 302;
            res.setHeader("Location", req.url);
            res.end();
          } else {
            next();
          }
        },
        staticHandler,
        //if we get this far, assume a static resource could not be found and send the custom 404 file
        function(req, res, next) {
          req.url = "/404.html";
          next();
        },
        staticHandler, //TODO: maybe combine this with the handler above for a single "404Provider"
        //final resource handler before the error handler... if no custom 404.html file is present in this app,
        //write a basic message...
        //TODO: make this also be server-wide configurable
        function(req, res) {
          throw new Error(_404error);
        },
        //a shim to make sure errors are properly logged
        function(err, req, res, next) {          
          cache.getItem('feather-logger', function(_err, logger) {
            if (_err) next(err); else {
              if (err.message == _404error) {
                logger.error({category: '404', message: 'Request for non-existent resource: ' + req.originalUrl});
              } else {
                logger.error({category: 'uncaught', message: 'Uncaught Exception in request middleware stack --- Stacktrace:', exception: err});
              }
              next(err);
            }
          });
        },
        //per-request error handler
        Connect.errorHandler({showStack: options.debug})
      ];

      if(options.resources.publish.gzip){
        middleware.unshift(gzip.gzip());
      }

      // Log requests, but only if the http.access category is INFO or better.
      cache.getItem("feather-logger", function(err, logger) {
        if (err) ; else {
          if (logger.isLevelEnabled("info", "http.access")) {
            middleware.unshift(function(req, res, next) {
              
              // This part borrowed from connect's logger module
              var end = res.end;
              res.end = function(chunk, encoding){
                res.end = end;
                res.end(chunk, encoding);
                var line = formatRequestLog(req, res);
                logger.info({message: line, category:"http.access"});
              };
              next();
            });
          }
        }
      });
      cb(null, middleware, _rest);
    }
  });
};