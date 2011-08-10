exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "api_tester.rpcAsyncTest",
    path: "widgets/rpcAsyncTest/",
    prototype: {
      testRPC: feather.Widget.serverMethod(function(_cb) {
        process.nextTick(function() {
          _cb(null, "foo");
        });
      })
    }
  });
};