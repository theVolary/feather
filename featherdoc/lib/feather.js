/* This file exists only for the feather framework to expose itself as a "require()'able" module within your app
 * EXAMPLE (from a file in this same lib folder): 
 *    var feather = require("./feather").getFeather();
 *
 *
 * NOTE: This is a generated file; do not edit or remove this file from your app.
 */
var _feather;
exports.init = function(feather) {
  _feather = feather;
};
exports.getFeather = function() {
  return _feather;
};