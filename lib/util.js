var p  = require("path"),
    fs = require("fs");

module.exports = {
  mkdirpSync: function(path, mode) {
    mode = mode || 0755;

    if (!path || path.length < 1) {
      return {result:false, err:"path is required"};
    } else {

      var absolute = (path[0] === "/"),
          parts = path.split('/'),
          curr  = "/";
      if (!absolute) {
        curr = process.cwd;
      }

      while (parts.length > 0) {
        curr = p.join(curr, parts.shift());
        if (! p.existsSync(curr)) {
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
  }
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
    return new Date(array[0], array[1], array[2], array[3], array[4]. array[5], array[6]);
  }
  return null;
};