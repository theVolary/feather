(function() {
  
  /**
   * @namespace Utility namespace for the framework
   * @name feather.util
   */
  feather.ns("feather.util");
  
  /**
   * Dynamically load script resources, with callback.
   * Options: <pre class="code">
   * {
   *    callback: function() {},
   *    files: ['filename.ext']
   * }
   * </pre>
   * @param {Object} options
   */
  feather.util.loadScripts = function(options) {
    var sem;
    if (options.callback) {
      sem = new feather.Semaphore(options.callback);
      sem.semaphore = options.files.length;
    }
    _.each(options.files, function(file) {
      //TODO: create a server side API that will let us get multiple files in 1 batch request (with caching)
      $.getScript(file, function() {
        sem.execute();
      });      
    });
  };

  /**
   * Dynamically load stylesheets
   */
  feather.util.loadStylesheet = function(href) {
    $("head").append("<link rel='stylesheet' type='text/css' href='" + href + "' />");
  };

  feather.util.parseQueryString = function() {
    var a = (window.location.search + window.location.hash).substr(1).split('&');
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=');
        if (p.length != 2) continue;
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
  };

  feather.util.qs = feather.util.parseQueryString();
  
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
  
})();
