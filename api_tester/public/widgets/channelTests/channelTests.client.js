feather.ns("api_tester");
(function() {

  //TODO fix the setup/teardowns so all tests can be re-run without refreshing the page

  var tests = [
    new Y.Test.Case({
 
      
      name: "Subscribe / Unsubscribe",

      //---------------------------------------------
      // Setup and tear down
      //---------------------------------------------

      setUp : function () {
      },

      tearDown : function () {              
      },

      //---------------------------------------------
      // Tests
      //---------------------------------------------

      /**
       * test fails if either subscribe or unsubscribe fail
       * 
       */ 
      testSubscribeUnsubscribe: function () {
        var test = this;
        var channel = feather.socket.subscribe({id: "channel1"});
        channel.once("subscribe", function() {
          channel.once("unsubscribe", function() {
            test.resume();
          });
          channel.unsubscribe();
        });  
        test.wait(200000); 
      }  
    }),

    new Y.Test.Case({
 
      name: "Other client connection / disconnection",

      //---------------------------------------------
      // Setup and tear down
      //---------------------------------------------

      setUp : function () {
        this.channel = feather.socket.subscribe({id: "channel2"});
      },

      tearDown : function () { 
        this.channel.unsubscribe();
        delete this.channel;             
      },

      //---------------------------------------------
      // Tests
      //---------------------------------------------

      testConnectionDisconnection: function () {
        var test = this;
        this.channel.once("connection", function() {
          test.channel.once("disconnection", function() {
            test.resume();          
          }); 
          test.popup.close();        
        });
        this.popup = window.open("/channelClient", "channelClient", "width=200, height=200");
        this.popup.focus();  
        test.wait(2000); 
      }
    }),

    new Y.Test.Case({
 
      name: "Sending Messages 1",

      //---------------------------------------------
      // Setup and tear down
      //---------------------------------------------

      setUp : function () {
        this.channel = feather.socket.subscribe({id: "channel2"});
      },

      tearDown : function () { 
        this.channel.unsubscribe();
        delete this.channel;             
      },

      //---------------------------------------------
      // Tests
      //---------------------------------------------

      testSendBounce: function () {
        var test = this;
        var id = feather.id();
        this.channel.once(id, function() {
          test.resume();          
        })
        this.channel.send(id);   
        test.wait(2000); 
      },

      testSendOtherClient: function () {
        var test = this;
        this.channel.once("connection", function() {
          test.channel.once("ack", function(args) {
            Y.Assert.areEqual("got it", args.message, "Expected 'got it' back from other client");
            test.popup.close();  
            test.resume();          
          });
          test.channel.send("test", {message: "hi"});      
        });
        this.popup = window.open("/channelClient", "channelClient", "width=200, height=200");
        this.popup.focus();  
        test.wait(2000); 
      }
    }),

    new Y.Test.Case({
 
      name: "Channel Restrictions",

      //---------------------------------------------
      // Setup and tear down
      //---------------------------------------------

      setUp : function () {
        this.channel = feather.socket.subscribe({id: "channel3"});
      },

      tearDown : function () { 
        this.channel.unsubscribe();
        delete this.channel;             
      },

      //---------------------------------------------
      // Tests
      //---------------------------------------------

      testNoAnnounce: function () {
        var test = this;
        this.channel.once("connection", function() {
          test.resume();
          Y.Assert.areEqual(1, 2, "Connection event should not have happened.");
          test.popup.close();        
        });
        this.popup = window.open("/channelClient", "channelClient", "width=200, height=200");
        this.popup.focus();
        setTimeout(function() {
          test.resume();
          test.popup.close();
        }, 2000);  
        test.wait(3000);  
      },

      testRestrictedMessage: function () {
        var test = this;
        this.channel.once("notAllowed", function() {
          test.resume();
          Y.Assert.areEqual(1, 2, "'notAllowed' message should not have been allowed.");
          test.popup.close();      
        });
        this.channel.once("error", function(args) {
          test.resume();
          Y.Assert.areEqual("Unsupported Messag", args.type, "Expected 'Unsupported Message'");
          test.popup.close();      
        });
        this.popup = window.open("/channelClient", "channelClient", "width=200, height=200");
        this.popup.focus();  
        test.channel.send("notAllowed", {message: "hi"}); 
        test.wait(3000); 
      },

      testAllowedMessage: function () {
        var test = this,
          timer;
        this.channel.once("test", function() {
          clearTimeout(timer);
          test.resume();
          test.popup.close();      
        });
        this.popup = window.open("/channelClient", "channelClient", "width=200, height=200");
        this.popup.focus();  
        test.channel.send("test", {message: "hi"}); 
        timer = setTimeout(function() {
          test.resume();
          Y.Assert.areEqual(1, 2, "'test' message should have been allowed.");
          test.popup.close();
        }, 2000);
        test.wait(3000); 
      }
    })
  ];

  api_tester.channelTests = feather.widget.create({
    name: "api_tester.channelTests",
    path: "widgets/channelTests/",
    prototype: {
      initialize: function($super, options) {
        $super(options);        
      },
      addTests: function() {
        var me = this;

        var suite = new Y.Test.Suite("Channels Tests");
        tests.each(function(test) {
          suite.add(test);
        })
        Y.Test.Runner.add(suite);
      }
    }
  });
})();