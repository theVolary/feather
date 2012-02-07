exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "api_tester.restTest",
    path: "widgets/restTest/",
    prototype: {
      registerRouteTest: feather.Widget.serverMethod(function(_cb) {
        // for this test, SSL needs to be configured to only enforce for a subset of routes
        // i.e. a mirror server must exist. So, check for the mirror and fail test if not present.
        feather.cache.getItem("feather-server-mirror", function(err, mirror) {
          if (mirror) {
            feather.rest.registerRoute(
              "get", 
              "/testDynamic/", 
              function(req, res, routeCB) {
                routeCB(null, [
                  {name: "foo"}, 
                  {name: "foo2"}
                ]);
              },
              _cb
            );
          } else {
            _cb("This test requires SSL to be setup for only a subset of routes. Please configure SSL routes to run this test.");
          }
        });
      })
    }
  });
};