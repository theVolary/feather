var sys = require("sys"),
    fs = require("fs");

//TODO: refactor the directory sniffing and file watching to be based on: http://github.com/mikeal/watch
exports.index = function(feather, options, callback) {
  feather.logger.info({message:"Indexing Files", category:"feather.srvr"});
  feather.appDirectories = {};
  feather.appFiles = {};
  feather.cssFiles = {};
  feather.featherFiles = {};
  feather.widgetClientFiles = {};
  feather.templateFiles = {};
  var topSem = new feather.lang.semaphore(callback);
  var _readdir = function(path, _cb) {
    //sys.puts("DIRECTORY: " + path);      
    fs.readdir(path, function(err, files) {
      if (!err) {
        _cb(err, path, files);
        topSem.execute();
      }
    });
  };
  topSem.increment();
  _readdir(options.publicRoot, function cb(err, path, files) {
    var dirs = [];
    var localSem = new feather.lang.semaphore(function() {
      //all stats at this level have completed, "recurse" as needed (not true recursion as the "tail" call is actually async)
      dirs.forEach(function(dir) {
        _readdir(path + "/" + dir, cb);
      });
    });
    files.forEach(function(file) {
      var filePath = path + "/" + file;
      //sys.puts(file);
      var fObj = {};
      feather.appFiles[filePath] = fObj;
      //rwg - 3/22/11
      //TODO: should we just register a watcher on all files? I'm not sure what sort of limits we might
      //already be pushing with all these file watchers though. Warrants some investigation.
      if (file.match(/\.feather\.html$/)) {
        feather.featherFiles[filePath] = fObj;
        //register a file watcher to invalidate caches (or whatnot) when the file changes
        fs.watchFile(filePath, function(curr, prev) {
          if (prev.mtime.getTime() != curr.mtime.getTime()) {
            feather.event.eventDispatcher.fire("filechange:" + filePath, {curr: curr, prev: prev});
          }
        });
      }
      if (file.match(/\.client\.js$/)) {
        feather.widgetClientFiles[filePath] = fObj;
        //register a file watcher to invalidate caches (or whatnot) when the file changes
        fs.watchFile(filePath, function(curr, prev) {
          if (prev.mtime.getTime() != curr.mtime.getTime()) {
            feather.event.eventDispatcher.fire("filechange:" + filePath, {curr: curr, prev: prev});
          }
        });
      }
      if (file.match(/\.css$/)) {
        feather.cssFiles[filePath] = fObj;
        fs.watchFile(filePath, function(curr, prev) {
          if (prev.mtime.getTime() != curr.mtime.getTime()) {
            feather.logger.trace("File " + filePath + " changed.");
            feather.event.eventDispatcher.fire("filechange:" + filePath, {curr: curr, prev: prev});
          }
        });
      }
      if (file.match(/\.template\.html$/)) {
        feather.templateFiles[filePath] = fObj;
        var templateData = fs.readFileSync(filePath, "utf8");
        //parse for id="" attributes and add the "${id}_" tokens
        //note: regex looks a bit more complex due to the need to exclude <widget> tags from this process
        templateData = templateData.replace(/<(([^w\/\s]|w[^i\s]|wi[^d\s]|wid[^g\s]|widg[^e\s]|widge[^t\s])*)\s([^>]*id=['"])([^'"\$]*)(['"][^>]*)>/g, "<$1 $3${id}_$4$5>");
        feather.templateFiles[filePath].data = templateData;
        fs.watchFile(filePath, function(curr, prev) {
          if (prev.mtime.getTime() != curr.mtime.getTime()) {
            feather.event.eventDispatcher.fire("filechange:" + filePath, {curr: curr, prev: prev});
          }
        });
      }
      //need to stat it
      topSem.increment();
      localSem.increment();
      fs.stat(filePath, function(err, stats) {
        if (err) {
          feather.logger.error({message: err, category: "feather.indexer"});
        }
        if (stats) {
          fObj.stats = stats;
          if (stats.isDirectory()) {
            dirs.push(file);
            topSem.increment();
            feather.appFiles[filePath].isDirectory = true;
            feather.appDirectories[filePath] = fObj;
          }
        }
        localSem.execute();
        topSem.execute();
      });
    });
  });
};