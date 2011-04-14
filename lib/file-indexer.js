var sys = require("sys"),
    fs = require("fs");

//TODO: refactor the directory sniffing and file watching to be based on: http://github.com/mikeal/watch
exports.index = function(feather, options, callback) {
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
      if (file.indexOf(".feather.html") > -1) {
        feather.featherFiles[filePath] = fObj;
        //register a file watcher to invalidate caches (or whatnot) when the file changes
        fs.watchFile(filePath, function(curr, prev) {
          feather.event.eventDispatcher.fire("filechange:" + filePath, {curr: curr, prev: prev});
        });
      }
      if (file.indexOf(".client.js") > -1) {
        feather.widgetClientFiles[filePath] = fObj;
        //register a file watcher to invalidate caches (or whatnot) when the file changes
        fs.watchFile(filePath, function(curr, prev) {
          feather.event.eventDispatcher.fire("filechange:" + filePath, {curr: curr, prev: prev});
        });
      }
      if (file.indexOf(".css") > -1) {
        feather.cssFiles[filePath] = fObj;
        fs.watchFile(filePath, function(curr, prev) {
          feather.event.eventDispatcher.fire("filechange:" + filePath, {curr: curr, prev: prev});
        });
      }
      if (file.indexOf(".template.html") > -1) {
        feather.templateFiles[filePath] = fObj;
        var templateData = fs.readFileSync(filePath, "utf8");
        //parse for id="" attributes and add the "${id}_" tokens
        templateData = templateData.replace(/<(([^w\/\s]|w[^i\s]|wi[^d\s]|wid[^g\s]|widg[^e\s]|widge[^t\s])*)\s([^>]*id=['"])([^'"\$]*)(['"][^>]*)>/g, "<$1 $3${id}_$4$5>");
        feather.templateFiles[filePath].data = templateData;
        fs.watchFile(filePath, function(curr, prev) {
          feather.event.eventDispatcher.fire("filechange:" + filePath, {curr: curr, prev: prev});
        });
      }
      //need to stat it
      topSem.increment();
      localSem.increment();
      fs.stat(filePath, function(err, stats) {
        if (err) {
          sys.puts("ERROR: " + err);
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