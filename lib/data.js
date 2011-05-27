var util = require("util"),
    fs = require("fs"),
    path = require("path"),
    inherits = require("inherits"),
    eventPub = require("./event-publisher"),
    semaphore = require("./semaphore"),
    fsm = require("./fsm");
    
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
      path.exists(fsm.dataFolder, function(exists) {
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
      path.exists(args.path, function(exists){
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

var dataInterface = module.exports = function(options) {
  options = options || {};
  var providerName = options.provider || 'couchdb';
  if (! require.resolve("./data/data-"+providerName)) {
    throw new Error("No data provider found for " + providerName);
  }
  logger.info({message:"Initializing data provider " + providerName, category:"feather.data"});
  var providerClass = require("./data/data-"+providerName).DataProvider;
  var provider = new providerClass(options);
  this.db = provider.getDb();
  logger.info({message:"Provider " + provider.name + " is ready.", category:"feather.data"});
};

dataInterface.prototype = {
  /**
   * Returns the raw database provider
   */
  getRawDb: function() {
    return this.db;
  },
  
  /**
   * Looks up documents by id.
   * @param {Object} idOrArrayOfIds either a String id, or an Array of String ids to retrieve documents for 
   * @param {String} rev optional.  Specific revision number to retrieve
   * @param {Function} callback function to call upon completion.  Params are err, and results, in that order.
   */
  get: function(idOrArrayOfIds, rev) {
    return this.db.get.apply(this.db, arguments);
  },
  
  /**
   * Queries a view at the connected db.
   * @param {String} path a string of the form "design_doc_name/view_name"
   * @param {Object} options Use this to pass any other options you wish to use when querying the view (startKey, endKey, limit, key, descending, etc.)
   * @param {Function} callback function to call upon completion.  Params are err, and results, in that order.
   */
  view: function() {
    return this.db.view.apply(this.db, arguments);
  },

  /**
   * Performs either a create or update for the document(s), depending on whether the id and rev params are passed or not.
   * @param {String} id optional.  If omitted, a generated id will be used, and the document will be saved as a new document.
   * @param {String} rev optional.  If omitted, a best guess will be used to determine the revision before saving.
   * @param {Object} doc an object or array of objects (for bulk save)
   * @param {Function} callback function to call upon completion.  Params are err, and results, in that order.
   */
  save: function(/* [id], [rev], doc | [doc, ...] */) {
    return this.db.save.apply(this.db, arguments);
  },
  
  /**
   * Performs a create or update for the document, interpreting the properties of the document 
   * and calling save correctly internally, depending on whether <em>id</em> and/or <em>_rev</em> 
   * properties are present in the document. 
   * @param {Object} doc document to save.
   * @param {Function} cb callback function
   */
  saveOrUpdate: function(doc, cb) {
    if (doc.id) {
      if (doc._rev) {
        this.db.save(doc.id, doc._rev, doc, cb);
      } else {
        this.db.save(doc.id, doc, cb);
      }
    } else {
      this.db.save(doc, cb);
    }
  },
  
  /**
   * Attempts to merge the properties in the given document with those in the persisted document.  
   * @param {Object} id optional.  if omitted, the function will attempt to read the id from the document.
   * @param {Object} doc the document (or partial document) to merge.
   * @param {Function} callback function to call upon completion.  Params are err, and results, in that order.
   */
  merge: function(/* [id], doc */) {
    return this.db.merge.apply(this.db, arguments);
  },
  
  /**
   * PUT a document, and write through cache
   * @param {String} id 
   * @param {Object} doc
   * @param {Function} callback function to call upon completion.  Params are err, and results, in that order.
   */
  put: function(id, doc, callback) {
    return this.db.put.apply(this.db, arguments);
  },
  
  /**
   * POST a document, and write through cache.
   * @param {Object} doc
   * @param {Function} callback function to call upon completion.  Params are err, and results, in that order.
   */
  post: function(doc, callback) {
    return this.db.post.apply(this.db, arguments);
  },
  
  /**
   * Perform a HEAD request.  In CouchDB, this returns basic information about the document, including its current revision number.
   * @param {Object} id
   * @param {Function} callback function to call upon completion.  Params are err, and results, in that order.
   */
  head: function(id, callback) {
    return this.db.head.apply(this.db, arguments);
  },
  
  /**
   * Retreives all documents from the database.  <b>Use sparingly!</b>
   * @param {Object} options Querying options.  See <a href="http://wiki.apache.org/couchdb/HTTP_view_API#Querying_Options">the CouchDB Wiki page</a> for the possible options.
   * @param {Function} callback function to call upon completion.  Params are err, and results, in that order.
   */
  all: function(options, callback) {
    return this.db.all.apply(this.db, arguments);
  },
  
  /**
   * Query a list, passing any options to the query string.  For more info on CouchDB lists, see <a href="http://guide.couchdb.org/editions/1/en/transforming.html">the Definitive CouchDB Guide</a>.
   * @param {Object} path
   * @param {Object} options
   */
  list: function(path, options) {
    return this.db.list.apply(this.db, arguments);
  },
  
  /**
   * Delete a document.  If the rev wasn't supplied, we attempt to retrieve 
   * it from the cache. If the deletion was successful, we purge the cache.
   * @param {Object} id
   * @param {Object} rev
   */
  remove: function(id, rev) {
    return this.db.remove.apply(this.db, arguments);
  },
  
  /**
   * Save the given attachment to the document stored at <i>id</i>.
   * @param {Object} id
   * @param {Object} [rev] optional.  If not supplied, it will be looked up from the cache.
   * @param {Object} attachmentName
   * @param {Object} contentType
   * @param {Object} dataOrStream
   */
  saveAttachment: function(/* id, [rev], attachmentName, contentType, dataOrStream */) {
    return this.db.saveAttachment.apply(this.db, arguments);
  },
  
  /**
   * Retrieves the named attachment to the given document.
   * @param {Object} docId
   * @param {Object} attachmentName
   */
  getAttachment: function(docId, attachmentName) {
    return this.db.getAttachment.apply(this.db, arguments);
  },

  /**
   * Exports all documents from the database to local json files.
   * 
   * @options an options object.  Options are: dataFolder
   * @callback a callback that will be called on completion.
   */
  exportDb: function(options, finalCallback) { 
     var dataFolder = options.dataFolder || (feather) ? [feather.appOptions.appRoot, "data"].join('/') : "./data";
     var docFolder = [dataFolder, 'docs'].join('/');
     var designFolder = [dataFolder, 'design'].join('/');

     var exportFsm = new fsm({
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
              delete fsm.subpathSemaphore;
              // TODO: This will need to page through documents eventually.  We don't want to dump the entire db into memory!
              this.db.all({ include_docs:true }, function(err, res) {
                if (err) {
                  fsm.fire('error', { err: err });
                } else { // Go speed racer!
                  fsm.docSemaphore = new semaphore(function() {
                    fsm.fire("completing", args);
                  })
                  res.forEach(function(key, value, id) {
                    fsm.fire('processDocument', { doc: value });
                  });
                }
              });
            }, // end stateStartup
            processDocument: function(fsm, args) {
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
                if (err) { fsm.fire('error', { err: err }); return; }
                fsm.docSemaphore.execute();
              });
            }, // end processDocument event
            error: function(fsm, args) {
              return fsm.states.aborted;
            },
            completing: function(fsm, args) {
              return fsm.states.exportComplete;
            }
          }, // end exporting state
          exportComplete: {
            stateStartup: function(fsm, args) {
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

  /**
   * Imports json files from the data folder of your app into the app db.
   * @param {Object} options  Options are: <ul><li>dataFolder: If omitted, "data" is assumed.</li><li>overwrite: if true, overwrite any existing documents in the app db.</li></ul>
   * @param {Object} finalCallback
   */
  importDb: function(options, finalCallback) {
    var dataFolder = options.dataFolder || (feather) ? [feather.appOptions.appRoot, "data"].join('/') : "./data";
    var docFolder = [dataFolder, 'docs'].join('/');
    var designFolder = [dataFolder, 'design'].join('/');
    var overwrite = options.overwrite;

    // Process:
    // read json files from data folder.
    // determine if each file (doc) exists.  If not, save it.  If it does, warn.

    var importFsm = new fsm({
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
             delete fsm.subpathSemaphore;

             return fsm.states.importingDesignDocs;
           }
         },
         importingDesignDocs: {
           stateStartup: function(fsm, args) {
              fs.readdir(designFolder, function(err, files) {
                if (err) { fsm.fire("error", {err:err}); return; }
                if (files.length > 0) {
                  fsm.fileSemaphore = new semaphore(function() {
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
             return fsm.states.aborted;
           },
           processFile: function(fsm, args) {
             fsm.fileSemaphore.increment();
             // check if the doc exists.  If it does and overwrite is on, delete it and put it.
             feather.data.appdb.get('_design/'+args.id, function(err, doc) {
               if (err && err.error && err.error === "not_found") {
                 fs.readFile([fsm.designFolder, args.file].join('/'), function(err, data) {
                   feather.data.appdb.save('_design/'+args.id, JSON.parse(data), function(err, res) {
                     if (err) { 
                       fsm.fire("error", {err:err, source:'design document save'}); 
                     } else {
                       fsm.fileSemaphore.execute();
                     }                     
                   });
                 });
               } else if (overwrite) {
                 feather.data.appdb.remove('_design/'+args.id, doc._rev, function(err, res) {
                   if (err) { 
                     fsm.fire("error", {err:err, source: 'design document deletion'});
                   } else {
                     fs.readFile([fsm.designFolder, args.file].join('/'), function(err, data) {
                       if (err) { 
                         fsm.fire("error", {err:err, source:'design document replace read'}); 
                       } else {
                         feather.data.appdb.save('_design/'+args.id, JSON.parse(data), function(err, res) {
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
                 fsm.fileSemaphore.execute();
               }
             }); // end get             
           }, // end processFile event
           completing: function(fsm, args) {
             return fsm.states.importingDocs;
           }
         },
         importingDocs: {
           stateStartup: function(fsm, args) {
             delete fsm.fileSemaphore;
             fs.readdir(docFolder, function(err, files) {
               if (err) { fsm.fire("error", {err:err}); return; }
               if (files.length > 0) {
                 fsm.fileSemaphore = new feather.lang.semaphore(function() {
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
             return fsm.states.aborted;
           },
           processFile: function(fsm, args) {
              fsm.fileSemaphore.increment();
              // check if the doc exists.  If it does and overwrite is on, delete it and put it.
              feather.data.appdb.get(args.id, function(err, doc) {
                if (err && err.error && err.error === "not_found") {
                  fs.readFile([docFolder, args.file].join('/'), function(err, data) {
                    feather.data.appdb.save(args.id, JSON.parse(data), function(err, res) {
                      if (err) { 
                        fsm.fire("error", {err:err}); 
                      } else {
                        fsm.fileSemaphore.execute();
                      }                     
                    });
                  });
                } else if (overwrite) {
                  feather.data.appdb.remove(args.id, doc._rev, function(err, res) {
                    if (err) { 
                      fsm.fire("error", {err:err});
                    } else {
                      fs.readFile([docFolder, args.file].join('/'), function(err, data) {
                        feather.data.appdb.save(args.id, JSON.parse(data), function(err, res) {
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
                  fsm.fileSemaphore.execute();
                }
              }); // end get             
            }, // end processFile event
           completing: function(fsm, args) {
             return fsm.states.importComplete;
           }
         },
         importComplete: {
           stateStartup: function(fsm, args) {
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
};

inherits(dataInterface, eventPub);
