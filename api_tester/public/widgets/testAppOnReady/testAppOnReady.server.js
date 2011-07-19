exports.getWidget = function(feather, cb) {

  //this line should not cause an error
  var foo = test_namespace.foo;

  cb(null, {
    name: "api_tester.testAppOnReady",
    path: "widgets/testAppOnReady/",
    prototype: {
      foo: foo
    }
  });
};