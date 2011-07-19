exports.onInit = function(feather) {
  feather.ns("test_namespace");
  test_namespace.foo = "bar";
}