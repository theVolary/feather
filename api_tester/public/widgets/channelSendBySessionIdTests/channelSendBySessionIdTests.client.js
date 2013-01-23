feather.ns("api_tester");
(function() {

  //TODO fix the setup/teardowns so all tests can be re-run without refreshing the page

  var tests = [
    new Y.Test.Case({
 
      
      name: "SendbySessionId",

      //---------------------------------------------
      // Setup and tear down
      //---------------------------------------------

      setUp : function () {
        this.channel = feather.socket.subscribe({id: "channel7"});
      },

      tearDown : function () {        
        this.channel.dispose();
        delete this.channel;            
      },

      //---------------------------------------------
      // Tests
      //---------------------------------------------

      /**
       * test fails if either subscribe or unsubscribe fail
       * 
       */ 
      testSendBySessionId: function () {
        var test = this;

        this.channel.once("bySessionId", function(args) {
          test.resume(function() {
            Y.Assert.areEqual('foo', args.data);
          });
        });  

        test.wait(2000); 
      }  
    })
  ];

  api_tester.channelSendBySessionIdTests = feather.Widget.create({
    name: "api_tester.channelSendBySessionIdTests",
    path: "widgets/channelSendBySessionIdTests/",
    prototype: {
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Channels Tests - sendBySessionId");
        _.each(tests, function(test) {
          suite.add(test);
        })
        Y.Test.Runner.add(suite);
      }
    }
  });
})();