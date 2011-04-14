var sys = require("sys"),
    fs = require("fs"),
    path = require("path"),
    cradle = require("cradle");
    

var importExportStates = {
  initial: {
    stateStartup: function(fsm, args) {
      sys.puts("state initial");
    },
    verifyPaths: function(fsm, args) {
      sys.puts("in verifyPaths");
      return fsm.states.verifyingDataFolder;
    }
  },
  verifyingDataFolder: {
    stateStartup: function(fsm, args) {
      sys.puts("starting to verify data folder");
      path.exists(fsm.dataFolder, function(exists) {
        if (!exists) {
          fsm.fire('createFolder', args);
        } else {
          fsm.fire('pathVerified', args);
        }
      });
    },
    createFolder: function(fsm, args) {
      sys.puts("vdf.createFolder");
      fs.mkdir(fsm.dataFolder, '0755', function(err) {
        if (err) { fsm.fire('error', { err: err }); return; }
        fsm.fire('pathVerified', args);
      })
    },
    pathVerified: function(fsm, args) {
      sys.puts("vdf.pathVerified");
      return fsm.states.verifyingSubFolders;
    },
    error: function(fsm, args) {
      sys.puts("vdf.error");
      return fsm.states.aborted;
    }
  }, // end verifyingDataFolder state
  verifyingSubFolders: {
    stateStartup: function(fsm, args) {
      sys.puts("state verifyingSubFolders")
      fsm.subpathSemaphore = new feather.lang.semaphore(function() {
        return fsm.states.subfoldersVerified;
      });
      fsm.fire('verifyFolder', { path: fsm.designFolder });
      fsm.fire('verifyFolder', { path: fsm.docFolder });
    },
    verifyFolder: function(fsm, args) {
      sys.puts("vsf.verifyFolder");
      fsm.subpathSemaphore.increment();
      path.exists(args.path, function(exists){
        if (!exists) {
          fsm.fire('createFolder', args);
        } else {
          fsm.fire('pathVerified', args);
        }
      });
    }, 
    createFolder: function(fsm, args) {
      sys.puts("vsf.createFolder");
      fs.mkdir(args.path, '0755', function(err) {
        if (err) fsm.fire('error', { err: err });
        fsm.fire('pathVerified', args);
      })
    },
    pathVerified: function(fsm, args) {
      sys.puts("vsf.pathVerified");
      return fsm.subpathSemaphore.execute();
    },
    error: function(fsm, args) {
      sys.puts("vsf.error");
      return fsm.states.aborted;
    }
  }, // end verifyingSubFolders
  aborted: {
    stateStartup: function(fsm, args) {
      sys.puts("state aborted");
      if (fsm.finalCallback) fsm.finalCallback(args.err);
    }
  }, // end aborted
};


exports.DataProvider = Class.create(feather.event.eventPublisher, {
  name: "CouchDB",
  initialize: function($super, options) {
    $super(options);
    
    options = options || {};
    
    if (!options.hostUrl) { 
      // TODO: make this more elegant instead of crashing the server.
			throw new Error("hostUrl is required");
		}
		this.hostUrl = options.hostUrl;
		this.dbName = options.dbName;
		this.dbPort = options.dbPort || 5984;
		this.cache = options.cache;
		this.raw = options.raw;
		this.auth = options.auth;
		this.secure = options.secure;

		this.db = new(cradle.Connection)(this.hostUrl, this.dbPort, {
			cache: this.cache,
			raw: this.raw,
			secure: this.secure,
			auth: this.auth
		}).database(this.dbName);
  }, // end initialize
  
  getDb: function() {
    return this.db;
  }
});