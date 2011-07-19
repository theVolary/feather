var Connect = require("connect"),
    router = require("./router"),
    cache = require("./simple-cache");

var emptyMiddleware = function(req, res, next) {
  next();
};

exports.getMiddleware = function(options, cb) {
  router.getRouter(options, function(err, _router) {
    if (err) cb(err); else {
      var staticHandler = Connect.static(options.publicRoot);

      var middleware = [
        Connect.cookieParser(),
        Connect.session(options.session.config),
        function(req, res, next) {
          cache.getItems([
            "feather-server",
            "feather-logger"
          ], function(err, cacheItems) {
            if (err) next(err); else {
              var server = cacheItems["feather-server"],
                logger = cacheItems["feather-logger"];

              if (!server.sessionStore) {
                server.sessionStore = req.sessionStore;
              }
              
              if (options.onRequest && typeof(options.onRequest) === 'function') {
                options.onRequest(require("./feather"), req, res, next);
              }
              
              //basic benchmarking
              req.startTime = (new Date()).getTime();
              
              logger.trace({templateId:'separator', category:'feather.http'});
              logger.trace({message:"processing request: ${url}", replacements:req, category:'feather.http'});
                              
              req.on("end", function() {
                //simple per-request benchmarking
                var newTick = (new Date()).getTime();
                var diff = newTick - req.startTime;
                logger.trace({message:"request took ${ms} milliseconds", replacements:{ms:diff}, category:'feather.http'});
                logger.trace({templateId:'separator', category:'feather.http'});
              }); 
              
              next();
            }
          });
        },
        _router,
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
          //res.writeHead(200, {'Content-Type': 'text/plain'});
          //res.end('404 - The file you have requested could not be found. (default)');
         throw new Error("404 - The file you have requested could not be found.");
        },
        //per-request error handler
        Connect.errorHandler({showStack: options.debug})
      ];
      cb(null, middleware);
    }
  });
};