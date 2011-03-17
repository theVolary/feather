var couchdb = {


	cradle: null,
	db: null,
	hostUrl: null,
	dbName: null,
	dbPort: 5984,
	cache: true,
	raw: false,
	auth: { username:"", password:"" },
	useAuth: false,
	secure: false,
	
	initialize: function(options) {
		if (!options.hostUrl) { 
			// TODO: Do some sort of logging here.
			return false; 
		} else {
			this.hostUrl = options.hostUrl;
		}
		this.dbName = options.dbName || null;
		this.dbPort = options.dbPort || 5984;
		if (options.cache) { this.cache = options.cache; }
		if (options.raw) { this.raw = options.raw; }
		if (options.auth) {
			this.auth = options.auth;
			this.useAuth = true;
		}
		if (options.secure) { this.secure = options.secure; }
		
		this.cradle = require("cradle");
		
		this.db = new(this.cradle.Connection)(this.hostUrl, this.dbPort, {
			cache: this.cache,
			raw: this.raw,
			secure: this.secure,
			auth: this.useAuth ? this.auth : undefined
		}).database(this.dbName);
	}, // end initialize
	
	/**
	 * Queries a view at the connected db.
	 * 
	 * @path a string of the form "design_doc_name/view_name"
	 * @options options object.  Use this to pass any other options you wish to use when querying the view (startKey, endKey, limit, key, descending, etc.)
	 */
	view: function(path, options, callback) {
	  
	  return this.db.view(path, options, callback);
	},
	
	/**
	 * Exports all documents from the database to local json files.
	 * 
	 * @options an options object.  Options are: dataFolder
	 * @callback a callback that will be called on completion.
	 */
   exportDb: function(options, finalCallback) { 
     var dataFolder = options.dataFolder || (jojo) ? [jojo.appOptions.appRoot, "data"].join('/') : "./data";
     var docFolder = [dataFolder, 'docs'].join('/');
     var designFolder = [dataFolder, 'design'].join('/');
     var fs = require("fs");
     var path = require("path");
     var sys = require("sys");
     
     var exportFsm = new jojo.fsm.finiteStateMachine({
        states: {
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
              path.exists(dataFolder, function(exists) {
                if (!exists) {
                  fsm.fire('createFolder', args);
                } else {
                  fsm.fire('pathVerified', args);
                }
              });
            },
            createFolder: function(fsm, args) {
              sys.puts("vdf.createFolder");
              fs.mkdir(dataFolder, '0755', function(err) {
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
          }, // end verifyingDataFolder states
          verifyingSubFolders: {
            stateStartup: function(fsm, args) {
              sys.puts("state verifyingSubFolders")
              fsm.subpathSemaphore = new jojo.lang.semaphore(function() {
                return fsm.states.exporting;
              });
              fsm.fire('verifyFolder', { path: designFolder });
              fsm.fire('verifyFolder', { path: docFolder });
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
          },
          aborted: {
            stateStartup: function(fsm, args) {
              sys.puts("state aborted");
              if (finalCallback) finalCallback(args.err);
            }
          },
          exporting: {
            stateStartup: function(fsm, args) {
              sys.puts("state exporting");
              delete fsm.subpathSemaphore;
              couchdb.db.all({ include_docs:true }, function(err, res) {
                if (err) {
                  fsm.fire('error', { err: err });
                } else { // Go speed racer!
                  fsm.docSemaphore = new jojo.lang.semaphore(function() {
                    fsm.fire("completing", args);
                  })
                  res.forEach(function(key, value, id) {
                    fsm.fire('processDocument', { doc: value });
                  });
                }
              });
            }, // end stateStartup
            processDocument: function(fsm, args) {
              sys.puts("exp.processDocument");
              fsm.docSemaphore.increment();
              var doc = args.doc;
              var folder = docFolder;
              var filename = doc._id;

              // Strip off the rev num.
              if (doc.rev) delete doc.rev;
              if (doc._rev) delete doc._rev;
              
              // Determine folder (design docs go in design)
              if (doc._id.indexOf('_design/') === 0) {
                folder = designFolder;
                filename = doc._id.substring(8);
              }
              fs.writeFile([folder, filename].join('/') + '.json', JSON.stringify(doc), "utf8", function(err) {
                sys.puts("writeFile callback.  semaphore is " + fsm.docSemaphore.semaphore);
                if (err) { fsm.fire('error', { err: err }); return; }
                return fsm.docSemaphore.execute();                
              });
            }, // end processDocument event
            error: function(fsm, args) {
              sys.puts("exp.error");
              return fsm.states.aborted;
            },
            completing: function(fsm, args) {
              return fsm.states.complete;
            }
          }, // end exporting state
          complete: {
            stateStartup: function(fsm, args) {
              sys.puts("state complete");
              delete fsm.docSemaphore;
              if (finalCallback) finalCallback(null);
            }
          } // end complete state
        } // end states
      }); // end fsm
      
      exportFsm.fire('verifyPaths');
   },
	
	exportView: function(path, options) {
	  var dataFolder = options.dataFolder || "/data";
	  
	},
	
	importDb: function(options) {
	  // read json files from data folder.
	  // save documents to couchdb.
	}
	
	
};

exports.db = couchdb;

