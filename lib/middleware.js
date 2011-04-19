var Connect = require("connect");

var emptyMiddleware = function(req, res, next) {
  next();
};

exports.middleware = [
  Connect.cookieParser(),
  Connect.session(feather.appOptions.session.config),
  function(req, res, next) {
    //easy access to current request and response
    feather.request = req;
    feather.response = res;
    if (!feather.server.sessionStore) {
      feather.server.sessionStore = req.sessionStore;
    }
    
    //fsm-less requests (this stuff was moved from base-app's states)
    //this was done to increase per request performance...
    if (feather.appOptions.onReady && typeof(feather.appOptions.onReady) === 'function') {
      feather.appOptions.onReady();
      feather.appOptions.onReady = null;
    }
    
    //basic benchmarking
    req.startTime = (new Date()).getTime();
    
    feather.logger.trace({templateId:'separator', category:'feather.http'});
    feather.logger.trace({message:"processing request: ${url}", replacements:req, category:'feather.http'});
                    
    req.on("end", function() {
      //simple per-request benchmarking
      var newTick = (new Date()).getTime();
      var diff = newTick - req.startTime;
      if (feather.logger) {
        feather.logger.trace({message:"request took ${ms} milliseconds", replacements:{ms:diff}, category:'feather.http'});
        feather.logger.trace({templateId:'separator', category:'feather.http'});
      }
      delete feather.request;
      delete feather.response;
    });     
    
    //start running through the middleware
    next();
  },
  // feather framework level routers (socket io, resource packager stuff, etc.)
  // app-level routing (custom url mappers, etc.)
  feather.routers[0].router,
  Connect.static(feather.appOptions.publicRoot),
  //if we get this far, assume a static resource could not be found and send the custom 404 file
  function(req, res, next) {
    req.url = "/404.html";
    next();
  },
  Connect.static(feather.appOptions.publicRoot), //TODO: maybe combine this with the handler above for a single "404Provider"
  //final resource handler before the error handler... if no custom 404.html file is present in this app,
  //write a basic message...
  //TODO: make this also be server-wide configurable
  function(req, res) {
    //res.writeHead(200, {'Content-Type': 'text/plain'});
    //res.end('404 - The file you have requested could not be found. (default)');
   throw new Error("404 - The file you have requested could not be found.");
  },
  //per-request error handler
  Connect.errorHandler({showStack: feather.appOptions.debug})
];
