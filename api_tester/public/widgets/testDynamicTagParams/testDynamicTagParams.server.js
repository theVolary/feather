exports.getWidget = function(feather, cb) {
  feather.ns("api_tester");

  api_tester.dynamicTagParams = function(foo, bar, baz, bool, num, request, _cb) {
    _cb(null, {
      foo: foo,
      bar: bar,
      baz: baz,
      bool: bool,
      num: num
    });
  };

  cb(null, {
    name: "api_tester.testDynamicTagParams",
    path: "widgets/testDynamicTagParams/"
  });
};