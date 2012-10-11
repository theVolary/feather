exports.onInit = function(feather, cb) {
  feather.ns("test_namespace");
  test_namespace.foo = "bar";

  // Reset the test database.
  var db = feather.data.appdb.getRawDb();
  db.info(function(err, response) {
    if (err) {
      console.error("Error getting info for test database: " + err.reason);
      db.create(function(err, response) {
        if (!err) {
          console.info("Created test database.")
          setup();
        } else {
          console.error("Could not create test database: " + err.reason);
        }
      });
    } else {
      db.destroy(function(err, response) {
        if (err) {
          console.error("Unable to delete test database: " + err.reason);
        } else {
          db.create(function(err, response) {
            if (!err) {
              console.info("Created test database.");
              setUp();
            } else {
              console.error("Could not create test database: " + err.reason);
            }
          });
        }
      }); // end destroy
    } // end else
  }); // end db info

  var zeroPad = function(num, length) {
    var out = num + "";
    while (out.length < length) {
      out = "0"+num;
    }
    return out;
  };

  var setUp = function(callback) {
    // design doc first.
    var docs = [
      { _id: "_design/test", 
        language: "javascript", 
        views: {
          test1: {
            map: 'function(doc) { if (doc.type && doc.type === "t1") { emit(doc._id, doc); } }'
          },
          test2: {
            map: 'function(doc) { if (doc.type && doc.type === "t2") { emit(doc._id, doc); } }'
          }
        }
      }
    ];
    var i;
    for(i = 0; i < 5; i++) {
      docs.push({type: "t1", name: "Test "+i, _id:"t1_"+i});
    }
    for (i = 0; i < 30; i++) {
      docs.push({type: "t2", name: "Test "+i, _id:"t2_"+zeroPad(i, 2)});
    }
    feather.logger.info("Saving " + docs.length + " documents.");
    feather.data.appdb.getRawDb().save(docs, function(err, response) {
      if (err) {
        feather.logger.error("Error pre-populating database: " + err.reason);
      } else {
        feather.logger.info("Database pre-populated.");
      }
      callback && callback();
    });
  };

  var tearDown = function(callback) {
    feather.data.appdb.getRawDb().all({include_docs:true},function(err, response) {
      if (!err) {
        var docs = _.map(response, function(doc) {
          doc.doc._deleted = true;
          return doc.doc;
        });
        feather.data.appdb.getRawDb().save(docs, function() {
          callback && callback();
        });
      }
    });
  };

  //tell feather to continue
  cb();
}

exports.onReady = function(feather) {
  if (feather.config('socket.io.enabled')) {
    require('./lib/addChannels').init(feather);
  }
}