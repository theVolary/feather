var currID = 0;
var defaultPrefix = "object";

/**
 * @namespace 
 * @name SimpleId
 */

/**
 * Simple incremental ID provider for cases where the developer wants to rely on the framework to auto ID stuff
 * @function
 * @param {String} prefix 
 * @returns {String} string of the form "featherXXX", where XXX is a number.
 * @memberOf SimpleId
 */
var simpleId = module.exports = function(prefix) {
  prefix = prefix || defaultPrefix;
  return prefix + currID++;
};