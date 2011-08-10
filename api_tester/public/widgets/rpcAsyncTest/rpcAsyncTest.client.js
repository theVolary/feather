feather.ns("api_tester");
(function() {
  api_tester.rpcAsyncTest = feather.Widget.create({
    name: "api_tester.rpcAsyncTest",
    path: "widgets/rpcAsyncTest/",
    prototype: {
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("RPC with async method return");

        suite.add(new Y.Test.Case({
          name: "RPC with async method return",
          setUp: feather.emptyFn,
          tearDown : function(){
            
          },

          testRPCAsync: function () {
            var test = this;
            me.server_testRPC(function(result) {
              test.resume(function() {
                Y.Assert.areEqual("foo", result.result);
              });
            });
            test.wait();
          }
        }));

        Y.Test.Runner.add(suite);
      }
    }
  });
})();