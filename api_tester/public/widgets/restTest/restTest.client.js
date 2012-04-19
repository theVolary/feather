feather.ns("api_tester");
(function() {
  api_tester.restTest = feather.Widget.create({
    name: "api_tester.restTest",
    path: "widgets/restTest/",
    prototype: {
      onInit: function() {
        
      },
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("RESTful API tests");

        suite.add(new Y.Test.Case({
          name: "GET",
          setUp: feather.emptyFn,
          tearDown : feather.emptyFn,

          testGetRoot: function () {
            var test = this,
              expected = JSON.stringify([
                {name: "foo"}, 
                {name: "foo2"}
              ]);

            $.ajax({
              url: "/_rest/test/",
              type: "GET",
              success: function(result) {
                test.resume(function() {
                  Y.Assert.areEqual(expected, JSON.stringify(result));
                });                
              }
            });

            test.wait();
          },

          testGetById: function () {
            var test = this,
              expected = JSON.stringify({
                name: "foo"
              });

            $.ajax({
              url: "/_rest/test/123",
              type: "GET",
              success: function(result) {
                test.resume(function() {
                  Y.Assert.areEqual(expected, JSON.stringify(result));
                });                
              }
            });

            test.wait();
          },

          testGetByIdError_500: function () {
            var test = this,
              expected = "\"error, 123 or 789 expected\"";

            $.ajax({
              url: "/_rest/test/456",
              type: "GET",
              statusCode: {
                500: function(result) {
                  test.resume(function() {
                    Y.Assert.areEqual(expected, result.responseText);
                  });         
                }
              }
            });

            test.wait();
          },

          testGetByIdError_404: function () {
            var test = this,
              expected = "\"Document not found\"";

            $.ajax({
              url: "/_rest/test/789",
              type: "GET",
              statusCode: {
                404: function(result) {
                  test.resume(function() {
                    Y.Assert.areEqual(expected, result.responseText);
                  });         
                }
              }
            });

            test.wait();
          }
        }));

        suite.add(new Y.Test.Case({
          name: "POST",
          setUp: feather.emptyFn,
          tearDown : feather.emptyFn,

          testPostRoot: function () {
            var test = this,
              expected = JSON.stringify([
                {name: "foo"}, 
                {name: "foo2"},
                {foo: "bar"}
              ]);

            $.ajax({
              url: "/_rest/test/",
              type: "POST",
              dataType: "json",
              contentType: "application/json",
              data: JSON.stringify({foo: "bar"}),
              success: function(result) {
                test.resume(function() {
                  Y.Assert.areEqual(expected, JSON.stringify(result));
                });                
              }
            });

            test.wait();
          }
        }));

        suite.add(new Y.Test.Case({
          name: "PUT",
          setUp: feather.emptyFn,
          tearDown : feather.emptyFn,

          testPutRoot: function () {
            var test = this,
              expected = JSON.stringify([
                {name: "foo"}, 
                {name: "foo2"},
                {foo: "bar"}
              ]);

            $.ajax({
              url: "/_rest/test/",
              type: "PUT",
              dataType: "json",
              contentType: "application/json",
              data: JSON.stringify({foo: "bar"}),
              success: function(result) {
                test.resume(function() {
                  Y.Assert.areEqual(expected, JSON.stringify(result));
                });                
              }
            });

            test.wait();
          }
        }));

        suite.add(new Y.Test.Case({
          name: "DELETE",
          setUp: feather.emptyFn,
          tearDown : feather.emptyFn,

          testDeleteRoot: function () {
            var test = this,
              expected = JSON.stringify([
                {name: "foo"}, 
                {name: "foo2"},
                {foo: "bar"}
              ]);

            $.ajax({
              url: "/_rest/test/",
              type: "DELETE",
              dataType: "json",
              contentType: "application/json",
              data: JSON.stringify({foo: "bar"}),
              success: function(result) {
                test.resume(function() {
                  Y.Assert.areEqual(expected, JSON.stringify(result));
                });                
              }
            });

            test.wait();
          }
        }));

        suite.add(new Y.Test.Case({
          name: "GET via restProxy",
          setUp: feather.emptyFn,
          tearDown : feather.emptyFn,

          testGetRoot: function () {
            var test = this,
              expected = JSON.stringify([
                {name: "foo"}, 
                {name: "foo2"}
              ]);

            feather.rest.test.get("/", function(args) {
              test.resume(function() {
                Y.Assert.areEqual(true, args.success);
                Y.Assert.areEqual(expected, JSON.stringify(args.result));
              });                
            });

            test.wait();
          },

          testGetById: function () {
            var test = this,
              expected = JSON.stringify({
                name: "foo"
              });

            feather.rest.test.get("/123", function(args) {
              test.resume(function() {
                Y.Assert.areEqual(true, args.success);
                Y.Assert.areEqual(expected, JSON.stringify(args.result));
              });                
            });

            test.wait();
          },

          testGetByIdError_500: function () {
            var test = this,
              expected = "\"error, 123 or 789 expected\"";

            feather.rest.test.get("/456", function(args) {
              test.resume(function() {
                Y.Assert.areEqual(false, args.success);
                Y.Assert.areEqual(500, args.statusCode);
                Y.Assert.areEqual(expected, args.xhr.responseText);
              });                
            });

            test.wait();
          },

          testGetByIdError_404: function () {
            var test = this,
              expected = "\"Document not found\"";

            feather.rest.test.get("/789", function(args) {
              test.resume(function() {
                Y.Assert.areEqual(false, args.success);
                Y.Assert.areEqual(404, args.statusCode);
                Y.Assert.areEqual(expected, args.xhr.responseText);
              });                
            });

            test.wait();
          }
        }));

        suite.add(new Y.Test.Case({
          name: "Test dynamic registering with SSL mirror",
          setUp: feather.emptyFn,
          tearDown : feather.emptyFn,

          testDynamicRouteRegistration: function () {
            var test = this,
              expected = JSON.stringify([
                {name: "foo"}, 
                {name: "foo2"}
              ]);    

            me.server_registerRouteTest([], function(args) {
              if (args.success || args.err == "Route already exists for that verb") {
                $.ajax({
                  url: "/_rest/testDynamic/",
                  type: "GET",
                  success: function(result) {
                    test.resume(function() {
                      Y.Assert.areEqual(expected, JSON.stringify(result));
                    });                
                  }
                });
              } else {
                test.resume(function() {
                  Y.Assert.fail(args.err);
                });
              }
            });

            test.wait();
          }
        }));

        Y.Test.Runner.add(suite);
      }
    }
  });
})();