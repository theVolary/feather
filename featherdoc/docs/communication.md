# feather client/server communication models #

## Overview ##
Once a feather page has been served to a client, there are several ways in which you can communicate with the server, and with other connected clients. At the core of feather's communications lies the excellent [socket.io](http://socket.io) library. This means we have full support for the WebSocket protocol, assuming the client supports it. It also means we have full support for server push, as well as client broadcasting of messages. The channel abstraction allows for a pub/sub event model for real-time communications, while the feather.widget.widgetServerMethod construct enables seamless widget-level RPC style communications.

## Widget-level RPC ##
If you'd like to encapsulate server-side methods within a given widget, there is an easy mechanism for doing so: feather.widget.widgetServerMethod(). When you wrap a method as a widgetServerMethod, a corresponding proxy method will be emitted to the client, which can be used to invoke the server method seamlessly. The name of the proxy method on the client will be the same name as the server method, prefixed with "server_" for clarity.

_Example_:

  If you have a widget 'foo', and foo.server.js looks like this:

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
  
  Then, in your foo.client.js, you can do something like this:

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
            me.server_doSomething("Whoaaaa Nelly!!!", function(args) {
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
    
## Channel Event-based Messaging ##
When you need to send messages to all connected clients, or a subset thereof, it's channels to the rescue. A channel is a glorified event publisher, who just happens to publish its events across connected clients via a socket.io broadcast.

The name you choose for your channel can also serve as a means of limiting the scope of which clients receive messages. The following examples illustrate the ease with which we can implement a chat widget using the concept of channels.

Channels are driven by the client-side. What I mean by that, is that you make your calls to feather.socket.addChannel from the client, not the server. Likewise, the actual events and messages are originated from the client. 
So when two browsers access the same page, and they both create channels of the same name, it's.

_Example 1_:
  
  In your chat widget's client.js file...

    feather.ns("myapp");
    (function() {  
    
      /**
       * create a generic channel named 'chat', which all clients can listen to
       */
      var chatChannel = feather.socket.addChannel("chat");
      
      myapp.foo = feather.widget.create({
        name: "myapp.foo",
        path: "widgets/foo/",
        prototype: {
          initialize: function($super, options) {
            $super(options);
          },
          onReady: function() {
            var me = this;
            //when one of my buttons is clicked, send a chat message on the chat channel
            me.domEvents.bind(me.get("#someButton"), "click", function() {
              chatChannel.fire("message", {message: "hi!"});
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
    
  Notice that in the above example when a client listens for an event on a given channel, messages from that client do not end up in its own listeners. In other words, if you wanted to test the (pseudo) code above, you would actually have to open the page in two separate browser tabs.
  Another important thing to note about the above example is that all instances of this widget will receive these messages, even if they are on different pages of your app.
  
_Example 2 (keying the channel name)_:

    feather.ns("myapp");
    (function() {  
    
      /**
       * create a page specific chat channel
       */
      var chatChannel = feather.socket.addChannel("chat:" + window.location.href);
      
      myapp.foo = feather.widget.create({
        name: "myapp.foo",
        path: "widgets/foo/",
        prototype: {
          initialize: function($super, options) {
            $super(options);
          },
          onReady: function() {
            var me = this;
            //when one of my buttons is clicked, send a chat message on the chat channel
            me.domEvents.bind(me.get("#someButton"), "click", function() {
              chatChannel.fire("message", {message: "hi!"});
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
  
  We've only changed 1 thing about this example, but it has a major impact of the behavior of this widget. Notice that we've now keyed the channel name by the current url, which means that only the chat widgets of clients that are currently viewing the same page will receive the messages.
  You can obviously key your channel names, as well as your message names by any number of data elements to achieve the appropriate level of segregation of publishers and subscribers for your use case.