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
      fsm.subpathSemaphore = new jojo.lang.semaphore(function() {
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

exports.init = function(appOptions) {
  sys.puts("data.init");  
  /**
  * Root namespace for data class definitions and services
  */
  jojo.ns("jojo.data");

  jojo.data.couchdb = Class.create(jojo.event.eventPublisher, {
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
    
    get: function(idOrArrayOfIds, rev) {
      return this.db.get.apply(this.db, arguments);
    },
    
    /**
  	 * Queries a view at the connected db.
  	 * 
  	 * @path a string of the form "design_doc_name/view_name"
  	 * @options options object.  Use this to pass any other options you wish to use when querying the view (startKey, endKey, limit, key, descending, etc.)
  	 */
  	view: function() {
  	  return this.db.view.apply(this.db, arguments);
  	},

    save: function() {
      return this.db.save.apply(this.db, arguments);
    },
    
    merge: function() {
      return this.db.merge.apply(this.db, arguments);
    },
    
    put: function() {
      return this.db.put.apply(this.db, arguments);
    },
    
    post: function() {
      return this.db.post.apply(this.db, arguments);
    },
    
    head: function() {
      return this.db.head.apply(this.db, arguments);
    },
    
    all: function() {
      return this.db.all.apply(this.db, arguments);
    },
    
    list: function() {
      return this.db.list.apply(this.db, arguments);
    },
    
    remove: function() {
      return this.db.remove.apply(this.db, arguments);
    },
    
    saveAttachment: function() {
      return this.db.saveAttachment.apply(this.db, arguments);
    },
    
    getAttachment: function() {
      return this.db.getAttachment.apply(this.db, arguments);
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

       var exportFsm = new jojo.fsm.finiteStateMachine({
          states: {
            initial: importExportStates.initial,            
            verifyingDataFolder: importExportStates.verifyingDataFolder,
            verifyingSubFolders: importExportStates.verifyingSubFolders,
            aborted: importExportStates.aborted,
            subfoldersVerified: {
              stateStartup: function(fsm, args) {
                return fsm.states.exporting;
              }
            },
            exporting: {
              stateStartup: function(fsm, args) {
                sys.puts("state exporting");
                delete fsm.subpathSemaphore;
                // TODO: This will need to page through documents eventually.  We don't want to dump the entire db into memory!
                jojo.data.appdb.all({ include_docs:true }, function(err, res) {
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
                  fsm.docSemaphore.execute();
                });
              }, // end processDocument event
              error: function(fsm, args) {
                sys.puts("exp.error");
                return fsm.states.aborted;
              },
              completing: function(fsm, args) {
                return fsm.states.exportComplete;
              }
            }, // end exporting state
            exportComplete: {
              stateStartup: function(fsm, args) {
                sys.puts("state complete");
                delete fsm.docSemaphore;
                if (finalCallback) finalCallback(null);
              }
            } // end complete state
          } // end states
        }); // end fsm

        exportFsm.dataFolder = dataFolder;
        exportFsm.designFolder = designFolder;
        exportFsm.docFolder = docFolder;
        exportFsm.fire('verifyPaths');
     }, // end exportDb

  	importDb: function(options, finalCallback) {
  	  var dataFolder = options.dataFolder || (jojo) ? [jojo.appOptions.appRoot, "data"].join('/') : "./data";
      var docFolder = [dataFolder, 'docs'].join('/');
      var designFolder = [dataFolder, 'design'].join('/');
      var overwrite = options.overwrite;

      // Process:
      // read json files from data folder.
      // determine if each file (doc) exists.  If not, save it.  If it does, warn.

      var importFsm = new jojo.fsm.finiteStateMachine({
        states: {
           initial: importExportStates.initial,            
           verifyingDataFolder: importExportStates.verifyingDataFolder,
           verifyingSubFolders: importExportStates.verifyingSubFolders,
           aborted: importExportStates.aborted,
           subfoldersVerified: {
             stateStartup: function(fsm, args) {
               return fsm.states.importing;
             }
           },
           importing: {
             stateStartup: function(fsm, args) {
               sys.puts("state importing");
               delete fsm.subpathSemaphore;

               return fsm.states.importingDesignDocs;
             }
           },
           importingDesignDocs: {
             stateStartup: function(fsm, args) {
               sys.puts("state importingDesignDocs");
                fs.readdir(designFolder, function(err, files) {
                  if (err) { fsm.fire("error", {err:err}); return; }
                  if (files.length > 0) {
                    fsm.fileSemaphore = new jojo.lang.semaphore(function() {
                      fsm.fire("completing", args);
                    });
                    files.forEach(function(file) {
                      var myArgs = {
                        id: file.substring(0, file.indexOf('.json')),
                        file: file
                      }
                      fsm.fire("processFile", myArgs);
                    });
                  }
                }); // end readdir
             },
             error: function(fsm, args) {
               sys.puts("impdes.error");
               return fsm.states.aborted;
             },
             processFile: function(fsm, args) {
               sys.puts("impdes.processFile " + args.id);
               fsm.fileSemaphore.increment();
               // check if the doc exists.  If it does and overwrite is on, delete it and put it.
               jojo.data.appdb.get('_design/'+args.id, function(err, doc) {
                 sys.puts("impdes get err: " + JSON.stringify(err));
                 if (err && err.error && err.error === "not_found") {
                   fs.readFile([fsm.designFolder, args.file].join('/'), function(err, data) {
                     jojo.data.appdb.save('_design/'+args.id, JSON.parse(data), function(err, res) {
                       if (err) { 
                         fsm.fire("error", {err:err, source:'design document save'}); 
                       } else {
                         fsm.fileSemaphore.execute();
                       }                     
                     });
                   });
                 } else if (overwrite) {
                   jojo.data.appdb.remove('_design/'+args.id, doc._rev, function(err, res) {
                     if (err) { 
                       fsm.fire("error", {err:err, source: 'design document deletion'});
                     } else {
                       sys.puts(args.id + " deleted.  replacing from disk.");
                       fs.readFile([fsm.designFolder, args.file].join('/'), function(err, data) {
                         debugger;
                         if (err) { 
                           fsm.fire("error", {err:err, source:'design document replace read'}); 
                         } else {
                           jojo.data.appdb.save('_design/'+args.id, JSON.parse(data), function(err, res) {
                             debugger;
                            if (err) { 
                              fsm.fire("error", {err:err, source: 'design document overwrite'}); 
                            } else {
                              fsm.fileSemaphore.execute();
                            }                     
                          }); // end save
                        } // end else
                      }); // end readfile
                     } // end else
                   }); // end remvoe
                 } else { // end else if overwrite
                   sys.puts(args.id + ' exists.  Ignoring it during import');
                   fsm.fileSemaphore.execute();
                 }
               }); // end get             
             }, // end processFile event
             completing: function(fsm, args) {
               sys.puts("impdes.completing");
               return fsm.states.importingDocs;
             }
           },
           importingDocs: {
             stateStartup: function(fsm, args) {
               sys.puts("state importingDocs");
               delete fsm.fileSemaphore;
               fs.readdir(docFolder, function(err, files) {
                 if (err) { fsm.fire("error", {err:err}); return; }
                 if (files.length > 0) {
                   fsm.fileSemaphore = new jojo.lang.semaphore(function() {
                     fsm.fire("completing", args);
                   });
                   files.forEach(function(file) {
                     var myArgs = {
                       id: file.substring(0, file.indexOf('.json')),
                       file: file
                     }
                     fsm.fire("processFile", myArgs);
                   });
                 }
               }); // end readdir
             },
             error: function(fsm, args) {
               sys.puts("impdoc.error");
               return fsm.states.aborted;
             },
             processFile: function(fsm, args) {
               sys.puts("impdoc.processFile");
                fsm.fileSemaphore.increment();
                // check if the doc exists.  If it does and overwrite is on, delete it and put it.
                jojo.data.appdb.get(args.id, function(err, doc) {
                  if (err && err.error && err.error === "not_found") {
                    sys.puts("doc " + args.id + " not found in db.");
                    fs.readFile([docFolder, args.file].join('/'), function(err, data) {
                      jojo.data.appdb.save(args.id, JSON.parse(data), function(err, res) {
                        if (err) { 
                          fsm.fire("error", {err:err}); 
                        } else {
                          fsm.fileSemaphore.execute();
                        }                     
                      });
                    });
                  } else if (overwrite) {
                    sys.puts("doc " + args.id + " found, but overwrite is on.");
                    jojo.data.appdb.remove(args.id, doc._rev, function(err, res) {
                      if (err) { 
                        fsm.fire("error", {err:err});
                      } else {
                        fs.readFile([docFolder, args.file].join('/'), function(err, data) {
                          jojo.data.appdb.save(args.id, JSON.parse(data), function(err, res) {
                           if (err) { 
                             fsm.fire("error", {err:err});
                           } else {
                             fsm.fileSemaphore.execute();
                           }                     
                         }); // end save
                       }); // end readfile
                      } // end else
                    }); // end remvoe
                  } else { // end else if overwrite
                    sys.puts(args.id + " exists.  Ignoring it during import.");
                    fsm.fileSemaphore.execute();
                  }
                }); // end get             
              }, // end processFile event
             completing: function(fsm, args) {
               sys.puts("impdoc.completing");
               return fsm.states.importComplete;
             }
           },
           importComplete: {
             stateStartup: function(fsm, args) {
               sys.puts("state complete");
               delete fsm.fileSemaphore;
               if (finalCallback) finalCallback(null);
             }
           } // end complete state
        } // end states
      });

      importFsm.dataFolder = dataFolder;
      importFsm.designFolder = designFolder;
      importFsm.docFolder = docFolder;
      importFsm.finalCallback = finalCallback;
      importFsm.fire("verifyPaths");
  	} // end importDb
  }); // end class definition.
  
  if (jojo.appOptions.data && jojo.appOptions.data.appdb) {
    jojo.data.appdb = new jojo.data.couchdb(jojo.appOptions.data.appdb);
  }
};