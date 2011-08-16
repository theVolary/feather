exports.getWidget = function(feather, cb) {
  api_tester.dynamicWithVarsTest = function(param1, request, _cb) {
    _cb(null, param1);
  };

  cb(null, {
    name: "api_tester.dynamicTmplVars",
    path: "widgets/dynamicTmplVars/",
    prototype: {
      onInit: function() {
        this.options.test = "foo";
      }
    }
  });
};