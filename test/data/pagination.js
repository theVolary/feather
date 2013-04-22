var should = require('should'),
    _ = require('underscore'),
    DataInterface = require("../../lib/data"),
    request = require("request");

var dbOpts = {
  provider: 'couchdb',
  hostUrl: 'http://localhost',
  dbName: 'datatest',
  auth: {
    username: "admin",
    password: "password"
  }
};

var db;

var testDocs = [
  { _id: "ag", name: 'Abbey Griffin', power: 2, toughness: 2, color: 'W' },
  { _id: "dw", name: 'Darkthicket Wolf', power: 2, toughness: 2, color: 'G' },
  { _id: "fb1", name: 'Festerhide Boar', power: 3, toughness: 3, color: 'G' },
  { _id: "fb2", name: 'Festerhide Boar', power: 3, toughness: 3, color: 'G' },
  { _id: "gr", name: 'Griffin Rider', power: 2, toughness: 2, color: 'W' },
  { _id: "go", name: 'Grizzled Outcasts', power: 4, toughness: 4, color: 'G' },
  { _id: "hs", name: 'Hollowhenge Scavenger', power: 4, toughness: 5, color: 'G' },
  { _id: "lk", name: 'Lumberknot', power: 1, toughness: 1, color: 'G' },
  { _id: "os", name: 'Orchard Spirit', power: 2, toughness: 2, color: 'G' },
  { _id: "sf", name: 'Silverchase Fox', power: 2, toughness: 2, color: 'W' },
  { _id: "tg", name: 'Thran Golem', power: 3, toughness: 3, color: 'C' },
  { _id: "um", name: 'Unruly Mob', power: 1, toughness: 1, color: 'W' },
  { _id: "ws", name: 'Woodland Sleuth', power: 2, toughness: 3, color: 'G' },
  {
    "_id": "_design/pagination",
    "language": "javascript",
    "views": {
      "byName": {
        "map": "function(doc) { emit(doc.name, doc); }",
        "reduce": "function(keys, values, rereduce) { if (rereduce) { var s = 0; values.forEach(function(val) { s += val; }); return s; } else { return values.length; }}"
      }
    }
  }
];

describe('pagination tests', function(done) {

  before(function(done) {
    console.info("In before");
    request.put({ uri: 'http://admin:password@localhost:5984/' + dbOpts.dbName }, function(err, res, body) {
      if (err || res.statusCode !== 201) {
        console.error("Error creating database: " + err + "; status " + (res ? res.statusCode : "unknown"));
        done();
        throw new Error("Could not create database " + err + "; status " + (res ? res.statusCode : "unknown"));
      } else {
        request({
          uri: 'http://admin:password@localhost:5984/' + dbOpts.dbName + "/_bulk_docs",
          json: { docs: testDocs },
          method: "POST"
        }, function(postErr, postRes, postBody) {
          if (postErr || postRes.statusCode !== 201) {
            done();
            throw new Error("Couldn't populate db.");
          } else {
            console.info("Database populated.");
            db = new DataInterface(dbOpts);
            done();
          }
        });
      }
    });
    // request.put({ uri: 'http://admin:password@localhost:5984/' + dbOpts.dbName + "_clean" }, function(err, res, body) {
    //   if (err || res.statusCode !== 201) {
    //     console.error("Error creating database: " + err + "; status " + (res ? res.statusCode : "unknown"));
    //     done();
    //     throw new Error("Could not create database " + err + "; status " + (res ? res.statusCode : "unknown"));
    //   } else {
    //     request({
    //       uri: 'http://admin:password@localhost:5984/' + dbOpts.dbName + "_clean/_bulk_docs",
    //       json: { docs: testDocs },
    //       method: "POST"
    //     }, function(postErr, postRes, postBody) {
    //       if (postErr || postRes.statusCode !== 201) {
    //         done();
    //         throw new Error("Couldn't populate db.");
    //       } else {
    //         console.info("Database populated.");
    //         db = new DataInterface(dbOpts);
    //         done();
    //       }
    //     });
    //   }
    // });
  });

  after(function(done) {
    _.each(testDocs, function(doc) {
      doc._deleted = true;
    });
    request({
      uri: "http://admin:password@localhost:5984/" + dbOpts.dbName,
      method: "DELETE"
    }, function(delErr, delRes, delBody) {
      done();
    });
    //done();
  });

  it("should return a total of 13 records when getting all", function(done) {
    db.find({
      source: 'pagination/byName',
      criteria: {
        reduce: false
      },
    }, function(err, result) {
      if (err) done(err); else {
        result.documents.length.should.equal(testDocs.length-1);
        done();
      }
    });
  });

  it("should return the correct records for page 1", function(done) {
    db.find({
      source: 'pagination/byName',
      returnValuesOnly: true,
      pagination: {
        pageSize: 3,
        cachePageBoundaries: true,
        pageBoundaries: [],
        pageNumber: 1
      }
    }, function(err, result) {
      if (err) done(err); else {
        result.documents.length.should.equal(3);
        result.options.pagination.pageBoundaries.length.should.equal(5);
        result.documents[0].name.should.equal('Abbey Griffin');
        result.documents[2].name.should.equal('Festerhide Boar');
        done();
      }
    });
  });

  it("should return the correct records for page 2", function(done) {
    db.find({
      source: 'pagination/byName',
      returnValuesOnly: true,
      pagination: {
        pageSize: 3,
        cachePageBoundaries: true,
        pageBoundaries: [{"key":"Abbey Griffin","_id":"ag"},{"key":"Festerhide Boar","_id":"fb2"},{"key":"Hollowhenge Scavenger","_id":"hs"},{"key":"Silverchase Fox","_id":"sf"},{"key":"Woodland Sleuth","_id":"ws"}],
        pageNumber: 2
      }
    }, function(err, result) {
      if (err) {
        done(err); 
      } else {
        result.documents.length.should.equal(3);
        result.options.pagination.pageBoundaries.length.should.equal(5);
        result.documents[0].name.should.equal('Festerhide Boar');
        result.documents[2].name.should.equal('Grizzled Outcasts');
        done();
      }
    });
  });

  it("should still work for page 1 with a user specified start key", function(done) {
    db.find({
      source: 'pagination/byName',
      returnValuesOnly: true,
      criteria: {
        startkey: 'F',
        endkey: 'I'
      },
      pagination: {
        pageSize: 3,
        cachePageBoundaries: true,
        pageBoundaries: [],
        pageNumber: 1
      }
    }, function(err, result) {
      if (err) done(err); else {
        result.documents.length.should.equal(3);
        result.documents[0].name.should.equal('Festerhide Boar');
        result.documents[2].name.should.equal('Griffin Rider');
        should.exist(result.options.pagination.docCount);
        result.options.pagination.docCount.should.equal(5, "doc count");
        done();
      }
    });
  });

  it("should still work for page 2 with a user specified start key", function(done) {
    db.find({
      source: 'pagination/byName',
      returnValuesOnly: true,
      criteria: {
        startkey: 'F'
      },
      pagination: {
        pageSize: 3,
        cachePageBoundaries: true,
        pageBoundaries: [{"key":"Festerhide Boar", "_id": "fb1"}, {"key":"Grizzled Outcasts","_id":"go"},{"key":"Hollowhenge Scavenger","_id":"h2"}],
        pageNumber: 2
      }
    }, function(err, result) {
      if (err) done(err); else {
        result.documents.length.should.equal(3);
        result.documents[0].name.should.equal('Grizzled Outcasts');
        result.documents[2].name.should.equal('Lumberknot');
        should.exist(result.options.pagination.docCount);
        result.options.pagination.docCount.should.equal(11);  // filtered results should be length of 11.
        done();
      }
    });
  });
});
