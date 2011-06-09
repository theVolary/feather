var fs = require("fs"),
    Registry = require("./registry"),
    EventPublisher = require("./event-publisher");

var FILE_MODIFIED = "filemodified";

/* Structure Overview:
 *  Watchers [
 *    { id: pathA, listeners: [ listener1, ..., listenerN ] }, 
 *    { id: pathB, listeners: [ listener1, ..., listenerN ] }
 *  ]
 */

var FileWatcher = function() {
  this.pollInterval = 0;
  this.watchers = new Registry();
  this.fwOptions = {
    persistent: true,
    interval: 0
  };
};

FileWatcher.prototype.setFileWatchInterval = function(intervalInMs) {
  // Only allow this to be modified when we're not watching any files to prevent confusion.
  if (this.watchers.length === 0) {
    this.pollInterval = intervalInMs || 0;
    this.fwOptions = {
      persistent: true,
      interval: this.pollInterval
    };
  }
};

FileWatcher.prototype.watchFile = function(path, listener) {
  var watcher = this.watchers.findById(path);
  // If the watcher exists, register the callback as a listener.
  if (! watcher) {

    // If the watcher doesn't exist, create one and register the callback.  Then watch the file.
    watcher = new EventPublisher({id: path});
    
    fs.watchFile(path, this.fwOptions, function(curr, prev) {
      // The 2nd param gets passed to the listener callbacks.
      watcher.fire(FILE_MODIFIED, { curr: curr, prev: prev });
    });

    this.watchers.add(watcher);

  }

  watcher.on(FILE_MODIFIED, listener);
  return watcher;
};

FileWatcher.prototype.watchFileMtime = function(path, listener) {
  var watcher = this.watchers.findById(path);

  // If the watcher exists, register the callback as a listener.
  if (! watcher) {

    // If the watcher doesn't exist, create one and register the callback.  Then watch the file.
    watcher = new EventPublisher({id: path});
    
    fs.watchFile(path, this.fwOptions, function(curr, prev) {
      console.log(path + " changed some property. mtimes are: " + curr.mtime.getTime() + ", " + prev.mtime.getTime());
      // var util = require("util");
      // console.log(util.inspect(curr));
      // console.log(util.inspect(prev));
      if (curr.mtime.getTime() !== prev.mtime.getTime()) {
        console.log(path + " changed mtime");
        // The 2nd param gets passed to the listener callbacks.
        watcher.fire(FILE_MODIFIED, { curr: curr, prev: prev });
      }
    });

    this.watchers.add(watcher);

  }

  watcher.on(FILE_MODIFIED, listener);
  return watcher;
}

function removeListener(watchers, watcher, listener) {
  if (watcher && listener) {
    var path = watcher.id;
    watcher.removeListener(FILE_MODIFIED, listener);

    if (watcher.listeners(FILE_MODIFIED).length === 0) {
      fs.unwatchFile(path);
      watchers.removeById(path);
      watcher.dispose();
    }
  }
}

FileWatcher.prototype.unwatchFile = function(path, listener) {
  var watcher = this.watchers.findById(path);
  removeListener(this.watchers, watcher, listener);
};

FileWatcher.prototype.unwatchAll = function() {
  //console.log(this.watchers.items.length + " watchers to iterate.");
  while (this.watchers.items.length > 0) {
    var w = this.watchers.items[0];
    //console.log("  watcher has " + w.listeners(FILE_MODIFIED).length + " listeners.");
    while (w && w.listeners && w.listeners(FILE_MODIFIED).length > 0) {
      var l = w.listeners(FILE_MODIFIED)[0];
      //console.log("    removing listener.");
      removeListener(this.watchers, w, l);
    }
  }
};

FileWatcher.prototype.dispose = function() {
  exports.unwatchAll();
  this.watchers.dispose();
};

// Singleton instance.
module.exports = new FileWatcher();