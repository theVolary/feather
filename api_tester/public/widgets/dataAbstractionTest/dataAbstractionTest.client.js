feather.ns("api_tester");
(function() {
  api_tester.dataAbstractionTest = feather.Widget.create({
    name: "api_tester.dataAbstractionTest",
    path: "widgets/dataAbstractionTest/",
    prototype: {
      onInit: function() {
        
      },
      addTests: function() {
        var me = this,
            suite = new Y.Test.Suite({
              name: "dataAbstraction"
            });

        suite.add(new Y.Test.Case({
          name: "getTestCase",

          testGetById: function () {
            var test = this;
            me.server_doGet([{id:"_design/test"}], function(args) {
              test.resume(function() {
                Y.Assert.isTrue(args.success, "Method unsuccessful");
                Y.Assert.isNull(args.err, "Error occurred");
                Y.Assert.areEqual("_design/test", args.result._id);
              });
            });
            test.wait(10000);
          },
          testGetByIds: function() {
            var test = this;
            me.server_doGet([{ids:["t1_0", "t1_1", "t1_2"]}], function(args) {
              test.resume(function() {
                Y.Assert.isTrue(args.success, "Method unsuccessful");
                Y.Assert.isNull(args.err, "Error occurred: " + args.err);
                Y.Assert.areEqual(3, args.result.length, "Wrong number of docs returned");
                Y.Assert.areEqual("t1_0", args.result[0]._id);
                Y.Assert.areEqual("t1_1", args.result[1]._id);
                Y.Assert.areEqual("t1_2", args.result[2]._id);
              });
            });
            test.wait(10000);
          },
          testMissingIds: function() {
            var test = this;
            me.server_doGet([{}], function(args) {
              test.resume(function() {
                Y.Assert.isNotNull(args.err, "Error should have occurred");
                Y.Assert.areEqual("No ids provided", args.err, "Error message mismatch: " + args.err);
                Y.Assert.isFalse(args.success, "Method successful?");
              });
            });
            test.wait(10000);
          },
      //   }));
      //   suite.add(new Y.TestCase({
      //     name: "saveTestCase",
      //     setUp: feather.emptyFn,
      //     tearDown: feather.emptyFn,

          testSaveOneNewDoc: function() {
            var test = this,
                newDoc = {
                  _id: "testSaveOneNewDoc",
                  type: "t3",
                  name: "Hi Mom!"
                };
            me.server_doSave([{doc:newDoc}], function(args) {
              test.resume(function() {
                Y.Assert.isTrue(args.success, "save method failed");
                Y.Assert.isNull(args.err, "save error occurred");
                Y.Assert.isNotNull(args.result._rev, "no rev found");
              });
            });
            test.wait(10000);
          },

          testSaveOneExistingDoc: function() {
            var test = this;
            me.server_doGet([{id: "t1_0"}], function(args) {
              if (args.err) {
                Y.Assert.fail("Error getting doc to update");
              }

              var doc = args.result,
                  originalRev = doc._rev;
              doc.name = "Updated 0";
              me.server_doSave([{doc: doc}], function(sArgs) {
                test.resume(function() {
                  Y.Assert.isNull(sArgs.err, "save error occurred");
                  Y.Assert.isTrue(sArgs.success, "save method failed");
                  Y.Assert.areNotEqual(originalRev, sArgs.result._rev, "revs should have been different after update");
                  Y.Assert.areEqual("Updated 0", sArgs.result.name, "name not updated");
                });
              });
            });
            test.wait(10000);
          },

          testSaveMultipleNewAndExistingDocs: function() {
            var test = this;
            me.server_doGet([{id: "t1_0"}], function(args) {
              if (args.err) {
                Y.Assert.fail("Error getting doc to update");
              }

              var eDoc = args.result,
                  originalRev = eDoc._rev,
                  newDoc = {
                    _id: "testSaveMultipleNewAndExistingDocs",
                    type: "t3",
                    name: "new doc"
                  };
              eDoc.name = "Updated 0";
              me.server_doSave([{docs: [eDoc, newDoc]}], function(sArgs) {
                test.resume(function() {
                  Y.Assert.isNull(sArgs.err, "save error occurred");
                  Y.Assert.isTrue(sArgs.success, "save method failed");
                  Y.Assert.isArray(sArgs.result, "result is not an array");
                  Y.Assert.areEqual(2, sArgs.result.length, "result array length is wrong");
                  Y.Assert.areNotEqual(originalRev, sArgs.result[0]._rev, "rev on existing doc should have been different after update");
                  Y.Assert.areEqual("Updated 0", sArgs.result[0].name, "name not updated on existing doc");
                  Y.Assert.isNotNull(sArgs.result[1]._rev, "rev on new doc is null");
                });
              });

            });
            test.wait(10000);
          },

          testSaveNoDocs: function() {
            var test = this;
            me.server_doSave([{}], function(args) {
              test.resume(function() {
                Y.Assert.isNotNull(args.err, "Error should have occurred");
                Y.Assert.areEqual("No document specified to save.", args.err);
                Y.Assert.isFalse(args.success, "Method successful?");
              });
            });
            test.wait(10000);
          },

          // Exists tests.
          testExistsFoundIt: function() {
            var test = this;
            me.server_doExists([{id:"t1_1"}], function(args) {
              test.resume(function() {
                Y.Assert.isNull(args.err);
                Y.Assert.isTrue(args.result);
                Y.Assert.isTrue(args.success, "Method unsuccessful");
              });
            });
            test.wait(10000);
          },

          testExistsDidntFindIt: function() {
            var test = this;
            me.server_doExists([{id:"iDoNotExist"}], function(args) {
              test.resume(function() {
                Y.Assert.isNull(args.err);
                Y.Assert.isFalse(args.result);
                Y.Assert.isTrue(args.success, "Method unsuccessful");
              });
            });
            test.wait(10000);
          },

          testExistsNoIdSpecified: function() {
            var test = this;
            me.server_doExists([{}], function(args) {
              test.resume(function() {
                Y.Assert.isNotNull(args.err, "Error should have occurred");
                Y.Assert.areEqual("No id specified", args.err);
                Y.Assert.isFalse(args.success, "Method successful?");
              });
            });
            test.wait(5000);
          },

          // Find tests.
          testFindNoSource: function() { // should error
            var test = this;
            me.server_doFind([{}], function(args) {
              test.resume(function() {
                Y.Assert.isNotNull(args.err, "Error should have occurred");
                Y.Assert.areEqual("No source option provided", args.err);
                Y.Assert.isFalse(args.success, "Method successful?");
              });
            });
            test.wait(5000);
          },

          testFindNoPaging: function() { // should just fetch data.
            var test = this;
            me.server_doFind([{source: "test/test2"}], function(args) {
              test.resume(function() {
                Y.Assert.isNull(args.err);
                Y.Assert.isTrue(args.success);
                Y.Assert.areEqual(30, args.result.documents.length);
              });
            });
            test.wait(10000);
          },

          testFindPaginationNoBoundaries: function() {
            var test = this;
            me.server_doFind([{
                source: "test/test2",
                pagination: {
                  pageSize: 10,
                  pageNumber: 2,
                  cachePageBoundaries: false
                }}], function(args) {
              test.resume(function() {
                Y.Assert.isNull(args.err);
                Y.Assert.isTrue(args.success);
                Y.Assert.areEqual(10, args.result.documents.length);
                Y.Assert.areEqual("t2_10", args.result.documents[0].key);
              });
            });
            test.wait(10000);
          },

          testFindPaginationBoundaries: function() {
            var test = this;
            me.server_doFind([{
                source: "test/test2",
                pagination: {
                  pageSize: 10,
                  pageNumber: 1,
                  cachePageBoundaries: true
                }}], function(args) {
              var options = args.result.options;
              options.pagination.pageNumber = 3;
              me.server_doFind([options], function(args2) {
                test.resume(function() {
                  Y.Assert.isNull(args2.err);
                  Y.Assert.isTrue(args2.success);
                  
                  var pag = options.pagination;
                  Y.Assert.isNotNull(pag.pageBoundaries);
                  Y.Assert.isArray(pag.pageBoundaries);
                  Y.Assert.areEqual(3, pag.pageBoundaries.length, "wrong number of page boundaries");

                  Y.Assert.areEqual(10, args2.result.documents.length);
                  Y.Assert.areEqual("t2_20", args2.result.documents[0].key);
                });
              });
            });
            test.wait(10000);
          },

          testFindCriteria: function() {
            var test = this;
            me.server_doFind([{
                source: "test/test2",
                criteria: {
                  startkey: "t2_25" // should leave 5 records returned.
                }}], function(args) {
              test.resume(function() {
                Y.Assert.isNull(args.err);
                Y.Assert.isTrue(args.success);
                Y.Assert.areEqual(5, args.result.documents.length);
                Y.Assert.areEqual("t2_25", args.result.documents[0].key);
              });
            });
            test.wait(10000);
          },

          testFindBadKey: function() {
            var test = this;
            me.server_doFind([{
              source: "test/test2",
              criteria: {
                key: null
              }
            }], function(args) {
              test.resume(function() {
                Y.Assert.isNotNull(args.err);
                Y.Assert.areEqual("A key was specified but was either undefined or null.  This can result in returning all documents.", args.err);
              });
            });
            test.wait(2000);
          },

          //Remove tests.
          testRemoveNoDoc: function() {
            var test = this;
            me.server_doRemove([{}], function(args) {
              test.resume(function(){ 
                Y.Assert.isNotNull(args.err, "Error should have occurred");
                Y.Assert.areEqual("No documents specified to remove.", args.err);
                Y.Assert.isFalse(args.success, "Method successful?");
              });
            });
            test.wait(5000);
          },

          testRemoveSingleDoc: function() {
            var test = this;
            me.server_doGet([{id: "t1_0"}], function(args) {
              if (args.err) {
                Y.Assert.fail("Error getting doc to remove");
              }
              me.server_doRemove([{doc:args.result}], function(rArgs) {
                test.resume(function(){ 
                  Y.Assert.isNull(rArgs.err, "remove error occurred");
                  Y.Assert.isTrue(rArgs.success, "remove method failed");
                  Y.Assert.isTrue(rArgs.result, "result returned was not true");
                });
              });
            });
            test.wait(5000);
          },

          testRemoveMultipleDocs: function() {
            var test = this;
            me.server_doGet([{ids: ["t1_1","t1_2"]}], function(args) {
              if (args.err) {
                Y.Assert.fail("Error getting docs to remove");
              }
              me.server_doRemove([{docs:args.result}], function(rArgs) {
                test.resume(function(){ 
                  Y.Assert.isNull(rArgs.err, "remove error occurred");
                  Y.Assert.isTrue(rArgs.success, "remove method failed");
                  Y.Assert.areEqual(2, rArgs.result.length, "bad number of results");
                  Y.Assert.areEqual("t1_1", rArgs.result[0]._id, "bad id for first result");
                  Y.Assert.isTrue(rArgs.result[0]._deleted, "first result does not have _deleted flag");
                  Y.Assert.areEqual("t1_2", rArgs.result[1]._id, "bad id for second result");
                  Y.Assert.isTrue(rArgs.result[1]._deleted, "second result does not have _deleted flag");
                });
              });
            });
            test.wait(5000);
          }

        }));
        Y.Test.Runner.add(suite);
      }
    }
  });
})();