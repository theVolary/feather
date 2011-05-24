var currID = 0;
var defaultPrefix = "object";

exports.id = function(prefix) {
  prefix = prefix || defaultPrefix;
  return prefix + currID++;
};