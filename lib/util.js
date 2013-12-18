var path  = require("path"),
    Connect = require("connect"),
    fs    = require("fs");

/**
 * @namespace Generic utility class.
 * @name Util
 */
module.exports = /** @lends Util.prototype */ {

  /**
   * Creates the given path, along with any missing paths in the hierarchy in a synchronous manner.  See FileSystem.mkdirSync in the node documentation.
   */
  mkdirpSync: function(_path, mode) {
    mode = mode || 0755;

    if (!_path || _path.length < 1) {
      return {result:false, err:"path is required"};
    } else {

      var absolute = path.resolve(_path),
          parts = absolute.split(path.sep),
          curr = parts[0] || path.resolve(path.sep);

      while (parts.length > 0) {
        curr = path.resolve(curr, parts.shift());
        if (! path.existsSync(curr)) {
          try {
            fs.mkdirSync(curr, mode);
          } catch (ex) {
            console.error(ex.message);
            return {result:false, err:ex.message};
          }
        }
      }
      return {result:true};
    } // end else
  },

  /**
   * This function should allow the original object to be extended in such a way that if the 
   * new object (n) already contains a property of the old (o) and it is an object, it delves 
   * into the old object and overrides individual properties instead of replacing the whole 
   * object.  Likewise, if a property is an array, it should concatenate the new onto the old
   * rather than replacing the entire array (think config.json: resources.packages property).
   *
   * NOTE: This is a simple implementation, in that we're not extending getters and setters properly.
   * Only use this for simple data model type objects.
   *
   * @param {Object} n The object to augment
   * @param {Object} o The object to augment from
   */
  recursiveExtend: function(n, o) {
    var type = null;
    for (var p in o) {
      
      if (n[p] && typeof(n[p]) === "object") {
        n[p] = module.exports.recursiveExtend(n[p], o[p]);
      } else if (n[p] && typeof(n[p]) === "array" && o[p] && typeof(o[p]) === "array") {
        n[p] = o[p].concat(n[p]);
      } else {
        n[p] = o[p];
      }
    }
    return n;
  }

  parseSignedCookie: function(cookie, secret) {
    return Connect.utils.parseSignedCookie(cookie, secret);
  };
};

/**
 * Converts a Date instance to an array with index of descending granularity (year, month, day, hour, min, sec).  This is useful for storing dates in document databases, since Date serializes to Object.
 * @augments Date
 * @returns {Array} 
 */
Date.prototype.toArray = function(){
  return [this.getFullYear(), this.getMonth(), this.getDate(), this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds()];
};

/**
 * Deserializes an array back into a date object.  Months (index 1) /must/ be one-based!
 * @augments Date
 * @static
 * @returns {Date}
 */
Date.fromArray = function(array) {
  if (array) {
    if (array.length < 7) {
      for (var i = array.length; i <= 7; i++) { array.push(0); }
      if (array[2] === 0) array[2] = 1; // Months are 1-based in Date
    }
    return new Date(array[0], array[1], array[2], array[3], array[4], array[5], array[6]);
  }
  return null;
};

