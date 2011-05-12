# feather client/server communication models #

## Overview ##
Once a feather page has been served to a client, there are several ways in which you can communicate with the server, and with other connected clients. At the core of feather's communications lies the excellent [socket.io](http://socket.io) library. This means we have full support for the WebSocket protocol, assuming the client supports it. It also means we have full support for server push, as well as client broadcasting of messages. The channel abstraction allows for a pub/sub event model for real-time communications, while the `feather.widget.widgetServerMethod` construct enables seamless widget-level RPC style communications.

## Widget-level RPC ##
If you'd like to encapsulate server-side methods within a given widget, there is an easy mechanism for doing so: `feather.widget.widgetServerMethod()`. When you wrap a method as a `widgetServerMethod`, a corresponding proxy method will be emitted to the client, which can be used to invoke the server method seamlessly. The name of the proxy method on the client will be the same name as the server method, prefixed with "server_" for clarity.

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

In general, this is a simple yet powerful mechanism you can use when the communication needs fit nicely into an encapsulated method of a given widget. It is often necessary, however, to facilitate communications outside of the tidy confines of a widget (i.e. client to client communications)...
    
## Channel Event-based Messaging ##
Channels in feather are a very simple yet powerful construct that enable clients to communicate with the server and each other in real time. Channels are defined on the server via the following basic syntax (the following examples assume you are building a chat widget):
  
In your chat widget's `server.js` file...

_Example 1 server.js_:

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

At this point I'd also like to point out that because the semantics of listening to messages are the same as listening for the `connection` events (by design), you cannot send your own `connection` messages. The following is the short list of _reserved_ messages, including `connection`:
 - `connection` (tells an already subscribed client that another client has connected to the channel)
 - `subscribe` (tells a client when its own subscribtion has been made successfully)
 - `disconnection` (tells a client that another client has disconnected from the channel)

### Channel Groups and Invitations ###
Now how about some more complex scenarios? For example, what if you wanted to limit the message propagation to only send to clients that are connected from the same page or base URL? Or how about if you wanted to allow two or more clients to communicate in private amongst themselves? 

The channel setting `allowGroups` lets you configure the channel to allow clients to subscribe to the channel as a whole as well as groups within the channel. The higher level channel constraints will still apply to groups (like allowed messages, etc.), but messages sent to a group will only propagate to clients that are active `members` of that group. This is how you could add a private messaging feature to your chat widget, as well as limit the message routing scope to a given page or URL.

When multiple clients have joined a group with the same name and that group has _not_ been configured as `secure`, there is no requirement for an invite step, since the clients have already explicitly stated that it's ok for other clients to communicate with them in that group. This will be the case for our group that's named by the current page's URL. In other words, the default behavior for a group is to not ask questions but to simply route messages amongst a subset of clients.

To support the concept of secure private groups we'll need to add one more step, however, and that is the notion of an `invite`. This step is necessary for clients to communicate with each other within any group that is configured as `secure`. The security of these `secure` groups goes two ways. The first step is that a client must declare a secure group with a unique name (i.e. the group must not already exist within this channel). Next, that client must issue an invite to another client via whatever identifying information has been made public to it (more on that in a bit). That's the first direction of security: the client declaring the secure group must explicitly identify other clients to invite into the group. The next direction is on the invitee's side. An invitation, when received, must be _accepted_ or _declined_. Failure to accept an invite before a configurable timeout period has elapse will result in a declination.

For our private messaging feature, however, . This acceptance can be made programatically if you wish, or can be delegated to a choice made by the user, but the answer must originate from the target client.

Finally, each channel may choose how it makes other clients known to each other. It's _very_ rarely a good idea to broadcast a given client's underlying identifiers like session token or socket.io ID, but it is often fine to pass along the username of the user associated with the client. We will use that method in our example, and use a lookup function based on the same when routing invites. This will also serve as the introduction the some of the channel's supported server side events and how you can use them to craft your channel's behaviors.

All that said, in this next example we'll achieve both goals of 1) limiting the main `chat` messages by URL and 2) allowing users to send private messages to each other. As explained above both goals will be met via the same `groups` mechanism. We'll also fill in a lot of other information in terms of the capabilities of channels, so keep reading...

_Example 3 server.js_:

    feather.ns("myapp");
    
    /**
     * create a channel with id 'chat', with no restrictions
     */
    var chatChannel = feather.socket.addChannel({
      id: "chat",
      messages: ["chat"],
      allowGroups: true,
      on: {
        
        /**
         * The subscribe event fires when a client is attempting to subscribe to a channel.
         * Inspecting args.message allows you to add data driven requirements for clients 
         * who wish to subscribe to the channel. If you set args.valid = false, the subscription
         * will fail.
         *
         * You can also send data back to the originating client if you like, by setting
         * args.data.
         *
         * The subscribe event does not propagate to other clients.
         *
         * @param {Object} args
         *    {
         *      client: {...}   //the client originating the request
         *      message: {...}  //the message data sent by the client, if any
         *      valid: true     //set to false if the request is to be denied
         *      data: undefined //populate with any data you wish to send back to the client
         *    }
         */
        subscribe: function(args) {
          //inspect args.message if your channel requires additional information
          //before accepting subscription requests
          if (args.message.foo !== "some_secret") {
            args.valid = false;
          } else {
            //send something back to the client
            args.data = "some_additional_data";
          }
        },

        /**
         * The connection event fires after a client has _successfully_ subscribed to a channel.
         * This event will propagate to all other already-connected clients, but not the originating
         * client. You may set args.data if you wish to provide any uniquely identifying information,
         * like username to the other clients. Otherwise, the other clients will simply get a 
         * 'connection' event with no other knowledge of who is doing the connecting.
         *
         * @param {Object} args
         *    {
         *      client: {...}   //the client originating the request
         *      message: {...}  //the message data sent by the client, if any
         *      data: undefined //populate with any data you wish to send back to the client
         *    }
         */
        connection: function(args) {
          //retrieve the user
        }
      }
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

_Example 3 client.js_:

    feather.ns("myapp");
    (function() {  
    
      /**
       * subscribe to the channel
       */
      var chatChannel = feather.socket.subscribe("chat", {
        groups: [window.location.href, feather.auth.user.username]
      });
      
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
              
              //send a message to only those clients that are connected via the same URL
              chatChannel.sendGroup(window.location.href, "chat", {message: "hi!"});
            });

            //When a different button is clicked (next to another user's screen name, for example),
            //send an invite to that user to join this user's private group. If the other client
            //accepts the invitation, send a private message. If they decline, alert the originating
            //user of that fact.
            me.domEvents.bind(me.get("#privateMessageButton_next_to_another_connected_client", "click", function() {
              //figure out which user they clicked on
              var username = getUsernameClickedOn(); //pseudo-code


            }));

            //when other clients connect, do something
            chatChannel.on("connection", function(args) {
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