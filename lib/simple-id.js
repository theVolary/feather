var currID = 0;
var defaultPrefix = "obj";

/**
 * @namespace 
 * @name SimpleId
 */

/**
 * Simple incremental ID provider for cases where the developer wants to rely on the framework to auto ID stuff
 * @function
 * @param {String} prefix 
 * @returns {String} string of the form "prefixXXX", where XXX is a number (incremented with each call) and prefix is either 'obj' or the prefix passed in.
 * @memberOf SimpleId
 */
var simpleId = module.exports = function(prefix) {
  prefix = prefix || defaultPrefix;
  return prefix + currID++;
};