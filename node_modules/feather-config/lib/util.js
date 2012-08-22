module.exports = {
   /** This function should allow the original object to be extended in such a way that if the 
   * new object (n) already contains a property of the old (o) and it is an object, it delves 
   * into the old object and overrides individual properties instead of replacing the whole 
   * object.  Likewise, if a property is an array, it should concatenate the new onto the old
   * rather than replacing the entire array.
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
      //} else if (n[p] && typeof(n[p]) === "array" && o[p] && typeof(o[p]) === "array") {
       // n[p] = o[p].concat(n[p]);
      } else {
        n[p] = o[p];
      }
    }
    return n;
  }
};