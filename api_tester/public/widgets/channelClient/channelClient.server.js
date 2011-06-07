exports.getWidget = function(appOptions, cb) {
  cb(null, {
    name: "api_tester.channelClient",
    path: "widgets/channelClient/"
  });
};