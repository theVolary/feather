exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "api_tester.ajaxErrorsTest",
    path: "widgets/ajaxErrorsTest/",
    prototype: {
      causeException: feather.Widget.serverMethod(function(_cb) {
        throw new Error('this should show up in the console');
      })
    }
  });
};