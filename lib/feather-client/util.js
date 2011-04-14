(function() {
  
  feather.ns("feather.util");
  
  /**
   * dynamically load script resources, with callback
   */
  feather.util.loadScripts = function(options) {
    var sem;
    if (options.callback) {
      sem = new feather.lang.semaphore(options.callback);
      sem.semaphore = options.files.length;
    }
    options.files.each(function(file) {
      //TODO: create a server side API that will let us get multiple files in 1 batch request (with caching)
      $.getScript(file, function() {
        sem.execute();
      });      
    });
  };
  
})();
