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
    }),

    new Y.Test.Case({
      name: "SendBySessionIdMultiple",

      setUp : function () {
        this.channel = feather.socket.subscribe({id: "channel8"});
        this.popup1 = window.open("/channelClient", "channelClient", "width=200, height=200");
        this.popup2 = window.open("/channelClient2", "channelClient2", "width=200, height=200");
      },

      tearDown : function () { 
        this.channel.dispose();
        this.popup1.close();
        this.popup2.close();
        delete this.channel;  
        delete this.popup1;     
        delete this.popup2;           
      },

      testSendBySessionIdMultiple: function () {
        var test = this;
        var messages = 0;
        this.channel.on("hey", function(args) {
          messages++;
          if(messages === 2) {
            test.channel.send("Heard you");
          }
        });
        var sessionMessage = 0;
        this.channel.on("came back", function(args) {
          sessionMessage++;
          if(sessionMessage === 2) {
            test.resume(function(){
              Y.Assert.areEqual(sessionMessage, 2);
            });
          }
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