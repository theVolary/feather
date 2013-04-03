var util = require("util"),
    path = require("path"),
    inherits = require("inherits"),
    EventPublisher = require("./event-publisher"),  
    _ = require("underscore"),
    Semaphore = require("./semaphore");

var dataInterface = module.exports = function(options) {
  options = options || {};
  
  var providerName = options.provider || 'couchdb';
  
  if (! require.resolve("./data/data-"+providerName)) {
    throw new Error("No data provider found for " + providerName);
  }
  
  var providerClass = require("./data/data-"+providerName).DataProvider;
  
  this.provider = new providerClass(options);
  this.db = this.provider.getDb();
};

dataInterface.prototype = {
  /**
   * Returns the raw database provider
   */
  getRawDb: function() {
    return this.db;
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
  list: function(path, options, cb) {
    //return this.db.list.apply(this.db, arguments);
    var cbError, cbResult;
    var sem = new Semaphore(function() {
      cb && cb.apply(cb, [cbError, cbResult]);
    });

    var internalCb = function() {
      cb && cb.apply(cb, arguments);
    };

    options = options || {};
    if (!options.source) {
      internalCb(formatError("No source option provided"));
      return;
    }
    var prefetchBoundaries = false,
        pageNum = 0,
        listOptions = _.extend({}, options.criteria || {});
        
    // Fetch data.
    sem.increment();
    this.db.list(options.source, listOptions, function(err, documents) {
      if (err) {
        cbError = formatError(err);

      } else {
        if (options.returnValuesOnly) {
          documents = _.pluck(documents, "value");
        }
        if (listOptions.limit) {
          documents = documents.slice(0, listOptions.limit);
        }
        cbError = err;
        cbResult = documents;
      }
      sem.execute();
    });
  },
  
  /**
   * Delete a document.  If the rev wasn't supplied, we attempt to retrieve 
   * it from the cache. If the deletion was successful, we purge the cache.
   * @param {Object} id
   * @param {Object} rev
   */
  // remove: function(id, rev) {
  //   return this.db.remove.apply(this.db, arguments);
  // },
  
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

  get: function(options, cb) {
    var idOrArrayOfIds = null;
    if (_.isString(options) || _.isArray(options)) {
      idOrArrayOfIds = options;
    } else {
      idOrArrayOfIds = options.id || options.ids;
    }
    if (! idOrArrayOfIds) {
      cb && cb(formatError("No ids provided"));
      return;
    }
    this.db.get(idOrArrayOfIds, function(err, docs) {
      if (_.isArray(docs)) {
        docs = _.pluck(docs, "doc");
      }
      cb && cb(formatError(err), docs);
    });
  },

  save: function(options, cb) {
    // var docOrDocArray = null;
    // if (_.isArray(options) || (! options.doc && !options.docs)) {
    //   docOrDocArray = options;
    // } else {
    //   docOrDocArray = options.doc || options.docs;
    // }
    var docOrDocArray = options.doc || options.docs;
    if (!docOrDocArray) {
      cb && cb(formatError("No document specified to save."));
    } else {

      var saveCallback = function(err, saveResults) {
        if (err) {
          cb && cb(formatError(err));
          return;
        }
        var result = _.isArray(saveResults) ? [] : null;
        if (_.isArray(saveResults)) {
          _.each(saveResults, function(docResult, index) {
            if (docResult.error) {
              var docError = formatError(docResult);
              docError.doc = docOrDocArray[index];
              result.push(docError);
            } else {
              docOrDocArray[index]._id = docResult._id || docResult.id;
              docOrDocArray[index]._rev = docResult._rev || docResult.rev;
              result.push(docOrDocArray[index]);
            }
          });
        } else { // single document save.
          docOrDocArray._id = saveResults._id || saveResults.id;
          docOrDocArray._rev = saveResults._rev || saveResults.rev;
          result = docOrDocArray;
        }
        cb && cb(formatError(err), result);
      };

      var docId = docOrDocArray._id || docOrDocArray.id;
      if (docId) {
        if (docOrDocArray._rev) {
          this.db.save(docId, docOrDocArray._rev, docOrDocArray, saveCallback);
        } else {
          this.db.save(docId, docOrDocArray, saveCallback);
        }
      } else {
        this.db.save(docOrDocArray, saveCallback);
      }
    }
  },
  remove: function(options, cb) {
    var docOrArrayOfDocs = options.doc || options.docs;
    var me = this;
    if (!docOrArrayOfDocs) {
      cb && cb(formatError("No documents specified to remove."));
      return;
    }
    validateRequired(docOrArrayOfDocs, ["_id", "_rev"], function(errs) {
      if (errs) {
        cb && cb(errs);
      } else {
        if (_.isArray(docOrArrayOfDocs)) {
          options.docOrArrayOfDocs = _.map(docOrArrayOfDocs, function(doc) { // Add _deleted flag and pass it to bulk save.
            if (doc) doc._deleted = true;
          });
          me.save(options, cb);
        } else {
          me.db.remove(docOrArrayOfDocs._id, docOrArrayOfDocs._rev, function(err, res) { // single document.
            if (err) {
              cb && cb(formatError(err));
            } else {
              cb && cb(null, true);
            }
          });
        }
      }
    });
  },
  exists: function(options, cb) {
    if (! options || !options.id) {
      cb && cb(formatError("No id specified"));
    } else {
      this.db.head(options.id, function(err, headers, response) {
        if (err) {
          cb && cb(formatError(err));
        } else {
          var foundIt = response !== 404 && headers.etag !== undefined;
          cb && cb(null, foundIt);
        }
      });
    }
  },
  find: function(options, cb) {
    
    var cbError, cbResult;
    var sem = new Semaphore(function() {
      cb && cb.apply(cb, [cbError, cbResult]);
    });

    var internalCb = function() {
      cb && cb.apply(cb, arguments);
    };

    options = options || {};
    if (!options.source) {
      internalCb(formatError("No source option provided"));
      return;
    }
    var prefetchBoundaries = false,
        pageNum = 0,
        pagination = options.pagination,
        paginationOn = pagination && pagination.pageSize && pagination.pageSize > 0,
        findOptions = _.extend({}, options.criteria || {});

    // Do a sanity check on the key.  This will help flush out bugs in utilizing code.
    if (findOptions.hasOwnProperty('key')) {
      if (_.isUndefined(findOptions.key) || _.isNull(findOptions.key)) {
        cbError = formatError("A key was specified but was either undefined or null.  This can result in returning all documents.");
        sem.increment();
        sem.execute();
        return;
      }
    }
        
    if (paginationOn) {

      findOptions.reduce = false;
      var totalFindOptions = _.extend({}, findOptions);
      totalFindOptions.reduce = true;
      sem.increment();
      this.db.view(options.source, totalFindOptions, function(err, count) {
        if (err) {
          pagination.docCount = 0;
        } else {
          pagination.docCount = count[0].value;
        }
        sem.execute();
      });

      if (pagination.pageNumber) {
        pageNum = pagination.pageNumber - 1; // Zero-base it.
      }

      if (pagination.cachePageBoundaries) {
        var alreadyHasBoundaries = _.isArray(pagination.pageBoundaries) && pagination.pageBoundaries.length > 0;
        if (alreadyHasBoundaries) {
          if (pagination.pageBoundaries.length > pageNum) {
            if (! findOptions.startkey) {
              findOptions.startkey = pagination.pageBoundaries[pageNum].key;
              findOptions.startkey_docid = pagination.pageBoundaries[pageNum]._id;
            } else if (pagination.pageNumber > 1) { // start key is specified and page number is one.  Use the provided start key
              findOptions.startkey = pagination.pageBoundaries[pageNum].key;
            }
            findOptions.limit = pagination.pageSize + 1;
          } else {
            internalCb(formatError("Requested page " + (pageNum+1) + " but there aren't that many pages."));
            return;
          }
        } else {
          prefetchBoundaries = true;
        }
      } else {
        findOptions.limit = pagination.pageSize + 1;
        if (pageNum > 0) { // don't skip if we're on page one. (index 0)
          findOptions.skip = pagination.pageSize * pageNum;
        }
      }
    } else { // end if pagination is on

    }

    // Fetch data.
    sem.increment();
    this.db.view(options.source, findOptions, function(err, documents) {
      if (err) {
        cbError = formatError(err);

      } else {
        if (documents.length && ! documents[0].value && findOptions.include_docs) {
          documents = _.map(documents, function(doc) {
            doc.value = doc.doc;
            delete doc.doc;
            return doc;
          });
        }
        if (prefetchBoundaries === true) {
          pagination.pageBoundaries = [];
          var index = 0;
          for(index = 0; index < documents.length; index += pagination.pageSize) {
            pagination.pageBoundaries.push({key: documents[index].key, _id: documents[index].id });
          }
          if (options.returnValuesOnly) {
            documents = _.pluck(documents, "value");
          }
          pagination.pageCount = pagination.pageBoundaries.length;
          pagination.docCount = documents.length;
          documents = documents.slice(pageNum*pagination.pageSize, Math.min(pagination.pageSize, documents.length));
          cbResult = {documents:documents, options:options}

        } else {
          if (options.returnValuesOnly) {
            documents = _.pluck(documents, "value");
          }
          if (findOptions.limit) {
            var limit;
            if (paginationOn) {
              limit = Math.min(pagination.pageSize, documents.length);
            } else {
              limit = findOptions.limit;
            }
            documents = documents.slice(0, limit);
          }
          cbError = err;
          cbResult = {documents:documents, options:options};
        }
      }
      sem.execute();
    });
  },
  findNextPage: function(options, cb) {
    options = offsetPage(options, 1);
    if (options) {
      this.find(options, cb);
    } else {
      cb && cb(formatError("No pagination options supplied"));
    }
  },
  findPreviousPage: function(options, cb) {
    options = offsetPage(options, -1);
    if (options) {
      this.find(options, cb);
    } else {
      cb && cb(formatError("No pagination options supplied"));
    }
  }
};

var offsetPage = function(options, offset) {
  if (options && options.pagination) {
      if (options.pagination.pageNumber) {
        options.pagination.pageNumber += offset;
      } else {
        options.pagination.pageNumber = 1;
      }
      return options;
    } else {
      return null;
    }
};

var formatError = function(_err) {
  if (!_err) return null;
  var err;// = _.extend({}, _err);
  if (_.isString(_err)) {
    err = new Error(_err);
  } else if ((_err instanceof Error) === false) {
    err = new Error(""); // error and reason properties get tacked on below.
  }
  if (!err.message) err.message = "";

  if (!_err.stack) {
    Error.captureStackTrace(err, formatError);
  }
  if (_err.error) {
    err.message += "; error: " + _err.error;
  }
  if (_err.reason) {
    err.message += "; reason: " + _err.reason;
  }
  if (err.message.indexOf('; ') === 0) {
    err.message = err.message.slice(2);
  }
  return err;
};

var resolveId = function(doc) {
  return doc._id || doc.id;
};

var resolveRev = function(doc) {
  return doc._rev || doc.rev;
};

var validateRequired = function(_obj, _arrayOfRequiredFieldNames, _cb) {
  if (!_obj) return false;

  var rfs = _arrayOfRequiredFieldNames,
      errs = [],
      validateObj = function(prefix, obj) {
        if (!obj) return;
        _.each(rfs, function(rf) {
          if (obj.hasOwnProperty(rf)) {
            if (obj[rf] === null || obj[rf] === undefined) {
              errs.push(formatError(prefix + rf + " is required"));
            }
          } else {
            errs.push(formatError(prefix + rf + " is required"));
          }
        });
      };

  if (_.isArray(_obj)) {
    _.each(_obj, function(obj, index) {
      validateObj("Item " + index + " ", obj);
    });
  } else {
    validateObj("", _obj);
  }
  _cb && _cb(errs.length > 0 ? errs : null);
  return errs;
};

inherits(dataInterface, EventPublisher);
