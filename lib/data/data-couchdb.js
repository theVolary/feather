var util = require("util"),
    fs = require("fs"),
    path = require("path"),
    cradle = require("cradle"),
    semaphore = require("../semaphore"),
    inherits = require("inherits"),
    eventPub = require("../event-publisher");
    

var importExportStates = {
  initial: {
    stateStartup: function(fsm, args) {
    },
    verifyPaths: function(fsm, args) {
      return fsm.states.verifyingDataFolder;
    }
  },
  verifyingDataFolder: {
    stateStartup: function(fsm, args) {
      fs.exists(fsm.dataFolder, function(exists) {
        if (!exists) {
          fsm.fire('createFolder', args);
        } else {
          fsm.fire('pathVerified', args);
        }
      });
    },
    createFolder: function(fsm, args) {
      fs.mkdir(fsm.dataFolder, '0755', function(err) {
        if (err) { fsm.fire('error', { err: err }); return; }
        fsm.fire('pathVerified', args);
      })
    },
    pathVerified: function(fsm, args) {
      return fsm.states.verifyingSubFolders;
    },
    error: function(fsm, args) {
      return fsm.states.aborted;
    }
  }, // end verifyingDataFolder state
  verifyingSubFolders: {
    stateStartup: function(fsm, args) {
      fsm.subpathSemaphore = new semaphore(function() {
        return fsm.states.subfoldersVerified;
      });
      fsm.fire('verifyFolder', { path: fsm.designFolder });
      fsm.fire('verifyFolder', { path: fsm.docFolder });
    },
    verifyFolder: function(fsm, args) {
      fsm.subpathSemaphore.increment();
      fs.exists(args.path, function(exists){
        if (!exists) {
          fsm.fire('createFolder', args);
        } else {
          fsm.fire('pathVerified', args);
        }
      });
    }, 
    createFolder: function(fsm, args) {
      fs.mkdir(args.path, '0755', function(err) {
        if (err) fsm.fire('error', { err: err });
        fsm.fire('pathVerified', args);
      })
    },
    pathVerified: function(fsm, args) {
      return fsm.subpathSemaphore.execute();
    },
    error: function(fsm, args) {
      return fsm.states.aborted;
    }
  }, // end verifyingSubFolders
  aborted: {
    stateStartup: function(fsm, args) {
      if (fsm.finalCallback) fsm.finalCallback(args.err);
    }
  }, // end aborted
};


var DataProvider = exports.DataProvider = function(options) {
  DataProvider.super.apply(this, arguments);
  this.name = "CouchDB";
    
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

  this.connection = new(cradle.Connection)(this.hostUrl, this.dbPort, {
    cache: this.cache,
    raw: this.raw,
    secure: this.secure,
    auth: this.auth
  });
	this.db = this.connection.database(this.dbName);
};
  
DataProvider.prototype.getDb = function() {
  return this.db;
};

inherits(DataProvider, eventPub);