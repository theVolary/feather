# feather client/server communication models #

## Overview ##
Once a feather page has been served to a client, there are several ways in which you can communicate with the server, and with other connected clients. At the core of feather's communications lies the excellent [socket.io](http://socket.io) library. This means we have full support for the WebSocket protocol, assuming the client supports it. It also means we have full support for server push, as well as client broadcasting of messages. The channel abstraction allows for a pub/sub event model for real-time communications, while the feather.widget.widgetServerMethod construct enables seamless widget-level RPC style communications.

## Widget-level RPC ##
If you'd like to encapsulate server-side methods within a given widget, there is an easy mechanism for doing so: feather.widget.widgetServerMethod(). When you wrap a method as a widgetServerMethod, a corresponding proxy method will be emitted to the client, which can be used to invoke the server method seamlessly. The name of the proxy method on the client will be the same name as the server method, prefixed with "server_" for clarity.

_Example_:

  If you have a widget `foo`, and `foo.server.js` looks like this:

    feather.ns("myapp");    
    myapp.foo = feather.widget.create({
      name: "myapp.foo",
      path: "widgets/foo/",
      prototype: {
        initialize: function($super, options) {
          $super(options);
        },
        doSomething: feather.widget.widgetServerMethod(function(arg1, cb) {
          //doSomething with arg1...
          var result = {message: "you sent me" + arg1};
          
          //when ready, call back 
          //notice we're following the 'error as first argument' nodejs callback style,
          //so pass null if there were no errors
          cb(null, result);
        })
      }   
    });  
  
  Then, in your `foo.client.js`, you can do something like this:

    feather.ns("myapp");    
    myapp.foo = feather.widget.create({
      name: "myapp.foo",
      path: "widgets/foo/",
      prototype: {
        initialize: function($super, options) {
          $super(options);
        },
        onReady: function() {
          var me = this;
          //when one of my buttons is clicked, do something on the server...
          me.domEvents.bind(me.get("#someButton"), "click", function() {
            me.server_doSomething(["Whoaaaa Nelly!!!"], function(args) {
              if (args.success) {
                alert(args.result.message);
              } else {
                alert("There was an error. Message: " + args.err);
              }
            });
          });
        })
      }   
    });

  Notice there is one little formatting gotcha when making calls to the `.server_XYZ` methods (`me.server_doSomething` in the above example), and that is that the arguments must be wrapped in an array. Since feather is pre v1.0 still, this API is subject to change, but for now, just remember to pass the arguments in an array.
    
## Channel Event-based Messaging ##
Channels in feather are a very simple yet powerful construct that enable clients to communicate with the server and each other in real time. Channels are defined on the server via the following basic syntax (the following examples assume you are building a chat widget):

_Example 1 server.js_:
  
  In your chat widget's `server.js` file...

    feather.ns("myapp");
    
    /**
     * create a channel with id 'chat', with no restrictions
     */
    var chatChannel = feather.socket.addChannel({id: "chat"});
    
    myapp.chat = feather.widget.create({
      name: "myapp.chat",
      path: "widgets/chat/",
      prototype: {
        initialize: function($super, options) {
          $super(options);
        }
      } // end prototype
    });
    
  Now in your widget's `client.js` file, you first must subscribe to the channel and then you can send and listen to messages...
  
_Example 1 client.js_:

    feather.ns("myapp");
    (function() {  
    
      /**
       * subscribe to the channel
       */
      var chatChannel = feather.socket.subscribe("chat");
      
      myapp.chat = feather.widget.create({
        name: "myapp.chat",
        path: "widgets/chat/",
        prototype: {
          initialize: function($super, options) {
            $super(options);
          },
          onReady: function() {
            var me = this;

            //when one of my buttons is clicked, send a chat message on the chat channel
            me.domEvents.bind(me.get("#someButton"), "click", function() {
              chatChannel.send("message", {message: "hi!"});
            });

            //when other clients connect, do something
            chatChannel.on("connection", function(args) {
              alert("another client has connected");
            });
            
            //when I receive a message event on the chat channel, update the UI
            chatChannel.on("message", function(args) {
              //in a real app we'd obviously do more than just alert, but you get the idea...
              alert("Incoming chat. Message = " + args.message);
            });
          })
        }   
      });
    })(); 

  In the above examples, the `chat` channel on the server is in the default liberal mode. This means that clients can send any messages they want. The vanilla configuration will also announce connections (subscriptions) to other clients, as can be seen in the `.on("connection"...)` bit of code above. 

  Now let's say you want to lock down valid messages and only allow `chat` messages, while at the same time turn off the connection announcements (we think you'd usually leave this on, but simply want to demonstrate turning it off in case you want to).

_Example 2 server.js_:
  
    feather.ns("myapp");
    
    /**
     * create a channel with id 'chat', with no restrictions
     */
    var chatChannel = feather.socket.addChannel({
      id: "chat",
      announceConnections: false,
      messages: ["chat"]
    });
    
    myapp.chat = feather.widget.create({
      name: "myapp.chat",
      path: "widgets/chat/",
      prototype: {
        initialize: function($super, options) {
          $super(options);
        }
      } // end prototype
    });

  As you can see, achieving our two goals is a simple matter. This channel will no longer announce new connections, and will only accept messages of type `chat`. Now let's make a little change in the `client.js` to make note of the effects...

_Example 2 client.js_:

    feather.ns("myapp");
    (function() {  
    
      /**
       * subscribe to the channel
       */
      var chatChannel = feather.socket.subscribe("chat");
      
      myapp.chat = feather.widget.create({
        name: "myapp.chat",
        path: "widgets/chat/",
        prototype: {
          initialize: function($super, options) {
            $super(options);
          },
          onReady: function() {
            var me = this;            

            //when one of my buttons is clicked, send a chat message on the chat channel
            me.domEvents.bind(me.get("#someButton"), "click", function() {
              //NOTE: the 'message' message type will now fail to propagate to the other clients
              chatChannel.send("message", {message: "hi!"});

              //send the supported message type 'chat' now:
              chatChannel.send("chat", {message: "hi!"});
            });

            //when other clients connect, do something
            chatChannel.on("connection", function(args) {
              //NOTE: this will never execute now that announcements are turned off
              alert("another client has connected");
            });
            
            //when I receive a chat event on the chat channel, update the UI
            chatChannel.on("chat", function(args) {
              //in a real app we'd obviously do more than just alert, but you get the idea...
              alert("Incoming chat. Message = " + args.message);
            });
          })
        }   
      });
    })(); 

  At this point I'd also like to point out that because the semantics of listening to messages is the same as listening for the `connection` events ()
  
  But how about some more complex scenarios? For example, what if you wanted to limit the message propagation to only send to clients that are connected from the same page or base URL? Or how about if you wanted to allow two or more clients to communicate in private amongst themselves? 

  The channel setting 'allowGroups' lets you configure the channel to allow clients to subscribe to the channel as a whole as well as groups within the channel. The higher level channel constraints will still apply to groups (like allowed messages, etc.)