var currID = 0;
var defaultPrefix = "object";

/**
 * Simple incremental ID provider for cases where the developer wants to rely on the framework to auto ID stuff
 * @returns {String} string of the form "featherXXX", where XXX is a number.
 */
exports.id = function(prefix) {
  prefix = prefix || defaultPrefix;
  return prefix + currID++;
};