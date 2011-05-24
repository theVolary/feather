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
            test.popup.close();  
            test.resume(function() {
              Y.Assert.areEqual("got it", args.message, "Expected 'got it' back from other client");
            });          
          });
          test.channel.send("test", {message: "hi"});      
        });
        this.popup = window.open("/channelClient", "channelClient", "width=200, height=200");
        this.popup.focus();  
        test.wait(2000); 
      }
    }),

    new Y.Test.Case({
 
      name: "No Connection Announcements",

      //---------------------------------------------
      // Setup and tear down
      //---------------------------------------------

      setUp : function () {
        this.channel = feather.socket.subscribe({id: "channel3"});
        this.popup = window.open("/channelClient", "channelClient", "width=200, height=200");
        this.popup.focus();
      },

      tearDown : function () { 
        this.channel.unsubscribe();
        this.popup.close();
        delete this.channel;  
        delete this.popup;           
      },

      //---------------------------------------------
      // Tests
      //---------------------------------------------

      testNoAnnounce: function () {
        var test = this,
          timer;;
        this.channel.once("connection", function() {
          clearTimeout(timer);  
          test.resume(function() {
            Y.Assert.areEqual(1, 2, "Connection event should not have happened.");
          });               
        });
        timer = setTimeout(function() {
          test.resume();
        }, 2000);  
        test.wait(3000);  
      }
    }),

    new Y.Test.Case({
 
      name: "Messaging Restrictions",

      //---------------------------------------------
      // Setup and tear down
      //---------------------------------------------

      setUp : function () {
        this.channel = feather.socket.subscribe({id: "channel4"});
        this.popup = window.open("/channelClient", "channelClient", "width=200, height=200");
        this.popup.focus();
      },

      tearDown : function () { 
        this.channel.unsubscribe();
        this.popup.close();
        delete this.channel;  
        delete this.popup;           
      },

      //---------------------------------------------
      // Tests
      //---------------------------------------------

      testRestrictedMessage: function () {
        var test = this;
        this.channel.once("notAllowed", function() {
          test.resume(function() {
            Y.Assert.areEqual(1, 2, "'notAllowed' message should not have been allowed.");
          });
        });
        this.channel.once("error", function(args) {
          test.resume(function() {
            Y.Assert.areEqual("Unsupported Message", args.type);
          });
        });
        test.channel.send("notAllowed", {message: "hi"}); 
        test.wait(3000); 
      },

      testAllowedMessage: function () {
        var test = this;
        test.channel.once("connection", function() {
          test.channel.once("ack", function(args) {
            test.resume(function() {
              Y.Assert.areEqual("got it", args.message, "Expected 'got it' back from other client");
            });          
          });
          test.channel.send("test", {message: "hi"});
        });        
        test.wait(2000);
      },

      testDirectMessageNotAllowed: function () {
        var test = this;
        test.channel.once("connection", function(connectionArgs) {
          test.channel.once("ack", function(args) {
            test.resume(function() {
              Y.Assert.fail("Direct Messaging should not have been allowed");
            });          
          });
          test.channel.once("error", function(args) {
            test.resume(function() {
              Y.Assert.areEqual("Direct Messages Not Allowed", args.type);
            }); 
          });
          test.channel.send("test", {message: "hi"}, [connectionArgs.clientId]);
        });        
        test.wait(2000);
      }
    }),

    new Y.Test.Case({
 
      name: "Direct Messaging & Groups",

      //---------------------------------------------
      // Setup and tear down
      //---------------------------------------------

      setUp : function () {
        this.channel = feather.socket.subscribe({id: "channel5"});
        this.popup1 = window.open("/channelClient", "channelClient", "width=200, height=200");
        this.popup2 = window.open("/channelClient2", "channelClient2", "width=200, height=200");
      },

      tearDown : function () { 
        this.channel.unsubscribe();
        this.popup1.close();
        this.popup2.close();
        delete this.channel;  
        delete this.popup1;     
        delete this.popup2;           
      },

      //---------------------------------------------
      // Tests
      //---------------------------------------------

      testDirectMessage: function () {
        var test = this;
        var error = false;
        test.channel.on("connection", function(connectionArgs) {
          if (connectionArgs.data && connectionArgs.data.clientMessage === "client2") {
            test.channel.once("ack2", function(args) {
              setTimeout(function() {
                if (!error) {
                  test.resume(function() {
                    Y.Assert.areEqual("got it", args.message, "Expected 'got it' back from other client");
                  }); 
                }
              }, 2000);         
            });
            test.channel.once("ack", function(args) {
              error = true;
              test.resume(function() {
                Y.Assert.areEqual(1, 2, "Only 1 client should have received the direct message.");
              })
            })
            test.channel.send("test", {message: "hi"}, [connectionArgs.clientId]);
          }
        });        
        test.wait(4000);
      },

      testPublicGroup: function() {
        var test = this;
        test.channel.once("groupJoined", function(args) {
          
        });
        test.channel.joinGroup("")
        test.wait(2000);
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