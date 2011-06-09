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

Notice there is one little formatting gotcha when making calls to the `.server_XYZ` methods (`me.server_doSomething` in the above example), and that is that the arguments must be wrapped in an array. Since feather is pre v1.0 still this API is subject to change, but for now just remember to pass the arguments in an array.

In general, this is a simple yet powerful mechanism you can use when the communication needs fit nicely into an encapsulated method of a given widget. It is often necessary, however, to facilitate communications outside of the tidy confines of a widget (i.e. client to client communications)...
    
## Channel Event-based Messaging ##
Channels in feather are a very simple yet powerful construct that enable clients to communicate with the server and each other in real time. Channels are defined on the server via the following basic syntax (the following examples assume you are building a chat widget):
  
In your chat widget's `server.js` file...

_Example 1 server.js_:
    
    exports.getWidget = function(feather, cb) {
      /**
       * create a channel with id 'chat', with no restrictions
       */
      var chatChannel = feather.socket.addChannel({id: "chat"});
      
      cb(null, {
        name: "myapp.chat",
        path: "widgets/chat/"
      });
    };
    
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
  
    exports.getWidget = function(feather, cb) {
    
      /**
       * create a channel with id 'chat'; don't announce connections; limit messages to 'chat'
       */
      var chatChannel = feather.socket.addChannel({
        id: "chat",
        announceConnections: false,
        messages: ["chat"]
      });
      
      cb(null, {
        name: "myapp.chat",
        path: "widgets/chat/"
      });
    };

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

At this point I'd also like to point out that because the semantics of listening to messages are the same as listening for the various channel events (for convenience and by design), there are some messages that you cannot send because they are reserved. The following is the short list of _reserved_ messages:
 - `connection` (tells an already subscribed client that another client has connected to the channel)
 - `disconnection` (tells a client that another client has disconnected from the channel)
 - `subscribed` (tells a client when its own subscription has been made successfully)
 - `unsubscribed` (tells a client when its own subscription has been removed)
 - `error` (sent back to the client that originated the message; the `data` property of the return object contains the error message.)
 - `group:*` (group communications are done via the `group:*` namespace. Clients using `group:group_name:message_name` syntax must be members of group `group_name` first. The .sendGroup() client side method is a convenience alias for sending messages in this format.)

Another very important, but potentially subtle thing to notice about our chat widget in its current form is that you could add instances of this widget on many pages of your application and all clients across all pages would receive all of the chat messages. This might be desirable for some applications, but there are certainly a lot of use cases for limiting who gets what messages on a given channel. 

### Private Messages, Groups and Invitations ###
Now how about some more complex scenarios? Let's refactor our chat widget to accomplish the following stated goals:
 - Limit the default message propagation to only send to clients that are connected from the same page or base URL.
 - Allow users to send private messages directly to a single other user.
 - Allow two or more clients to communicate in private amongst themselves as an invitation-only group. 

There are two main channel-level configuration settings that enable all three scenarios. The simple one is `allowDirectMessaging` (defaulted to `false`), and when set to `true` will let clients send messages directly to other clients. These direct messages are only visible to the clients involved (and of course the server). These messages are also governed by any other configuration you may have placed on the channel. Direct messaging comes with no inherent opt-in or opt-out process, so if you want to add an 'ignore this user' function, you'll have to implement the `message` handler on the server and track an ignore list yourself, or alternatively you could implement similar logic on the client side (using the channel specific `clientId` that's passed along with the `connection` events).

The channel setting `allowGroups` (defaulted to false) lets you configure the channel to allow clients to create and join groups within the channel. The higher level channel constraints will still apply to groups (like allowed messages, etc.), but messages sent to a group will only propagate to clients that are active `members` of that group. This is how you could limit the message routing scope to a given page or URL as well as implement a private group chat feature for a chat widget.

When multiple clients have joined a group with the same name and that group has _not_ been configured as `secure`, there is no requirement for an invite step, since the clients have already explicitly stated that it's ok for other clients to communicate with them in that group. This will be the case for our group that's named by the current page's URL. In other words, the default behavior for a group is to not ask questions but to simply route messages amongst a subset of clients within the channel (sort of a channel within a channel).

To support the concept of secure private groups we'll need to add one more step, however, and that is the notion of an `invite`. This step is necessary for clients to communicate with each other within any group that is configured as `secure`. The security of these `secure` groups goes two ways: 
  - The first step is that a client must declare a secure group with a unique name (i.e. the group must not already exist within this channel). This means that group names are on a first come first serve basis within a channel, but that can be reasonably mitigated by generating random group names via code. 
  - Next, that client must issue an invite to another client via whatever identifying information has been made public to it (more on that in a bit). That's the first direction of security: the client declaring the secure group must explicitly identify other clients to invite into the group. 
  - The next direction is on the invitee's side. An invitation, when received, must be either _accepted_ or _declined_. Failure to accept an invite before a configurable timeout period has elapsed will result in a declination. This acceptance can be made programatically if you wish, or can be delegated to a choice made by the user via your UI code, but the answer must originate from the target client. Once accepted, both clients are now able to communicate privately on the channel by using `.sendGroup(groupName, messageName, data)`.

The final bit of the puzzle is how a given client will know how to issue an invite to another individual client. In addition to a per-channel uuid key to identify clients, channels support passing along custom identifying information when announcing new connections. Be careful what you choose to send here though. Rather than sending a given client's underlying system identifiers like session token or socket.io ID it is usually better to pass something like the username (screen name) of the user associated with the client. Each application will have its own requirements for what's acceptable under various conditions. For our example, we'll use the username so that we can emulate a chat room type scenario.

With all that in mind, in this next example we'll achieve both goals of 1) limiting the main `chat` messages by URL and 2) allowing users to send private messages to each other. As explained above both goals will be met via the `groups` mechanism. 

This example will also fill in a lot of other information in terms of the capabilities of channels. I've opted to add more documentation into the code sample in the form of comments, so please excuse the verbosity...

_Example 3 server.js_:

    feather.ns("myapp");
    
    /**
     * create a channel with id 'chat', with no restrictions
     */
    var chatChannel = feather.socket.addChannel({
      id: "chat",
      messages: ["chat"],
      allowGroups: true,
      allowDirectMessaging: true,
      hooks: {
        
        /**
         * Defining handlers for various channel hooks lets you control the channel's behavior
         * in a very custom manner.
         * 
         * The subscribe hook is called when a client is attempting to subscribe to a channel.
         * Inspecting args.message allows you to add data driven requirements for clients 
         * who wish to subscribe to the channel. 
         * 
         * You may implement any logic here you wish, async or not, but if you do choose to implement
         * this hook handler you must call the supplied callback function at some point. Using the
         * standard node callback format of "errors go in the 1st argument", calling the callback
         * with a non-null/non-undefined value for the 1st argument will result in the subscription
         * request being rejected (this is how you can implement server-side validation). 
         * Passing null or undefined as the 1st argument and optionally any
         * data you want to send back in the 2nd argument will result in the subscription being accepted.
         * Failing to execute the callback function in your handler will simply mean the client will
         * never get a response back and will not be subscribed.
         *
         * note: The subscribe event does not propagate to other clients.
         *
         * @param {object} args
         *    {
         *      client: object,   //the client originating the request
         *      data:   object    //the message data sent by the client, if any
         *    }
         *
         * @param {function} cb - The callback function that must be called to either accept or reject the subscription request
         */
        subscribe: function(args, cb) {
          //inspect args.data if your channel requires additional information
          //before accepting subscription requests
          if (args.data.foo !== "some_secret") {
            cb("Subscription Denied");
          } else {
            //send something back to the client
            cb(null, "Welcome to the chat channel");
          }
        },

        /**
         * The connect hook will execute after a client has _successfully_ subscribed to a channel.
         * This event will propagate to all other already-connected clients, but not the originating
         * client. 
         *
         * The most common use case for implementing this hook is to pass custom identifying information along
         * to the other clients.
         *
         * This hook will only execute if the channel is configured to announce connections (which is the default).
         * 
         * If the connecting client has opted to send data along with the subscribe request, that data is also present here. 
         * 
         * Once again, if you choose to implement this hook handler, you must call the supplied callback with a
         * null or undefined value for the 1st argument for the connection event to propagate.
         * It would be a rare case when you'd actually implement this hook and _not_ allow propagation,
         * but we have exposed the possibility for you to do so (via passing a non-null value for the 1st argument
         * to the callback) just in case you find a need.
         *
         * @param {Object} args
         *    {
         *      client: Object,     //the client that just connected to the channel
         *      data:   Object      //the message data sent by the client, if any
         *    }
         *
         * @param {Function} cb - The callback function to be called when you are ready for the connection event to propagate
         */
        connect: function(args, cb) {
          //you could code the client-side to send the username along with the subscription request,
          //which might be easier in most cases, but for our contrived example we're going to use 
          //pseudo-code to fetch the username based on the Connect sessionID of the client... and yes,
          //the user would probably already be available on the session object, but once again this is
          //a _contrived_ example :)

          //retrieve the username (since we have a callback model, async is fine here, of course)
          myapp.pseudocode.fetchUserBySessionId(args.client.session.id, function(err, user) {
            if (err) {
              cb(err); 
            } else {
              cb(null, user.username); //2nd argument is data to make available to other clients
            }
          });
        },

        /**
         * The disconnect hook will execute after a client has left the channel, either explicitly
         * or because their general socket.io client has been disconnected.
         * 
         * Like the connect event, this one will only happen if the channel is configured with
         * 'announceConnections' set to true (which is the default).
         *
         * In most cases in which your widget/app cares about the connect event, it probably also
         * cares about the disconnect event. 
         * 
         * Remember: as is the case with all these event hooks, if you implement this handler
         * you must invoke the callback function in order to propagate the event to the other clients.
         *
         * @param {Object} args
         *    {
         *      client: Object    //the client that just disconnected from the channel
         *    }
         *
         * @param {Function} cb - The callback function to be called when you are ready for the disconnection event to propagate
         */
        disconnect: function(args, cb) {
          //for this one, we'll forego any custom logic (which yes, means we could have 
          //simply not implemented this handler, but you get the idea)...

          cb();
        },

        /**
         * The 'message' hook lets you perform logic on the server for every single message that gets
         * sent across the channel, if you so choose.
         * 
         * This might be a good place to add validation logic (to make sure the message is in the right
         * format, for example). You could also transform or augment the message with additional data,
         * like a server-based timestamp or something like that. You could even use this hook to 
         * implement your own special group-like construct for routing or add a command structure if
         * you wanted to use channels to create an RPG or some other game.
         * 
         * Remember: as is the case with all these event hooks, if you implement this handler
         * you must call the callback function in order to propagate the event to the other clients.
         *
         * NOTE: if the channel is configured to only allow certain message types, this hook will ONLY
         * fire for allowed messages.
         *
         * @param {object} args
         *    {
         *      client:   object,    //the client that originated the message
         *      message:  string,    //the message type being transmitted (i.e. 'chat')
         *      groupName: string,   //this contains the group name if this message is associated with a group; undefined otherwise
         *      directedTo: object (client),  //if this is a direct message, this will be the client that the message is being sent to; undefined otherwise
         *      data:     object     //the message payload (which could be a flat string or an object deserialized from JSON)
         *    }
         *
         * @param {Function} cb - The callback function to be called to send the message on its way or stop it in its tracks
         *    function(err /*{string | object}*/, )
         */
        message: function(args, cb) {
          //for this example, let's pretend we have a dictionary of swear words we want to use to clean up
          //all the messages before passing them on, and if the swear word count is 3 or more we refuse
          //to let the message through at all

          var cleanMessage = myapp.pseudocode.cleanAndCountSwearWords(args.data);
          if (cleanMessage.numSwearWords >= 3) {
            cb("Clean up your act, buster!");
          } else {
            cb(null, cleanMessage.message);
          }
        },

        /**
         * The next hook you have at your disposal is 'invalidMessage'. If you implement the handler for this
         * event, it will be called when a) the channel is configured to restrict the message types and b)
         * a client attempts to send an unsupported message.
         * 
         * One reason you might want to implement this handler is to log invalid message attempts.
         *
         * @param {Object} args
         *    {
         *      client:   Object,    //the client that originated the message
         *      message:  String,    //the message type the client is trying to send 
         *      data:     Object     //the message payload (which could be a flat string or an object deserialized from JSON)
         *    }
         *
         * NOTE: There is no callback function with this one. The client that originated the invalid message will
         * automatically be notified of this fact, and no other propagation will take place.
         */
        invalidMessage: function(args) {
          //just log 
          feather.logger.info("Invalid message attempt on the chat channel: " + args.message);
        },

        /**
         * The 'createGroup' handler allows you to control group creation behavior on the channel.
         * This handler will be invoked once the channel internals have determined that this is a new
         * group (remember, group creation is by name and is on a first come first serve basis). 
         *
         * As with all of the other hooks that have a callback, you must invoke the callback function
         * in order to allow the creation of the group. Failure to invoke the callback, or invoking it
         * with a non-null 1st argument will result in the group _not_ being created. This allows
         * you to place validation and other restrictive logic on the group creation process.
         *
         * @param {Object} args
         *    {
         *      client:     Object,    //the client that originated the group creation
         *      groupName:  String,    //the name of the group being created
         *      secure:     Boolean    //flag to indicate whether the group is secure or not (default false)
         *    }
         *
         * @param {Function} cb - The callback function to invoke to either allow or disallow group creation
         */
        createGroup: function(args, cb) {
          //server side validation and/or logging can go here...
          feather.logger.info("New group created on the chat channel: " + args.groupName);

          if (myapp.pseudocode.groupIsValid(client, groupName)) {
            cb();
          } else {
            cb("Group is invalid.");
          }
        },

        /**
         * The 'joinGroup' handler allows you to control logic around the joining of groups.
         * This handler will be invoked any time a client is trying to join an already existing
         * group.
         *
         * As with all of the other hooks that have a callback, you must invoke the callback function
         * in order to allow the client to join the group. Failure to invoke the callback, or invoking it
         * with a non-null 1st argument will result in the client _not_ joining the group. 
         *
         * @param {Object} args
         *    {
         *      client:     Object,    //the client that is trying to join the group
         *      groupName:  String     //the name of the group being joined
         *    }
         *
         * @param {Function} cb - The callback function to invoke to either allow or disallow the joining
         */
        joinGroup: function(args, cb) {
          //server side validation and/or logging can go here...
          feather.logger.info("New client joining group. username: " + client.session.user.username + ", group: " + args.groupName);

          if (myapp.pseudocode.joinIsValid(client, groupName)) {
            cb();
          } else {
            cb("You are not allowed to join this group, says the server.");
          }
        },

        /**
         * The 'invite' handler is invoked when a client is being invited to join a secure group.
         * Implementing this handler gives you similar validation controls to either allow the invitation
         * to be sent on, or disallow it.
         *
         * This might be where you'd implement some sort of blacklist or blocking logic, where you'd
         * squash the invitation if the target client has indicated that it doesn't want to hear from
         * the source client at all.
         *
         * @param {Object} args
         *    {
         *      sourceClient:   Object,   //the client that originated the invitation
         *      targetClient:   Object    //the client being invited to join the group
         *      groupName:      String,   //the name of the group 
         *    }
         *
         * @param {Function} cb - The callback function to invoke to either pass the invitation on or prevent it
         */
        invite: function(args, cb) {
          if (myapp.pseudocode.invitationAllowed(args)) {
            cb();
          } else {
            cb("You are not allowed to send invites to that person because they don't like you.");
          }
        },

        /**
         * The 'invitationAccepted' handler is invoked any time an invitation has been accepted. This is an
         * informational hook which you can handle for logging or other logic-branching purposes. There is no 
         * callback function to call for this one as we are not supporting the interruption
         * of this event. The intent to invite and to accept has already been declared by both parties, 
         * therefore to prevent propagation at this point would only serve to confuse.
         *
         * @param {Object} args
         *    {
         *      sourceClient:   Object,   //the client that originated the invitation
         *      targetClient:   Object,   //the client that has just accepted the invitation
         *      groupName:      String    //the name of the group 
         *    }
         */
        invitationAccepted: function(args, cb) {
          feather.logger.info("An invitation has been accepted for the group '" + args.groupName + "'");
        },

        /**
         * The 'invitationDeclined' handler is invoked any time an invitation has been declined. This is an
         * informational hook which you can handle for logging or other logic-branching purposes. There is no 
         * callback function to call for this one as we are not supporting the interruption
         * of this event. The intent to invite and to decline has already been declared by both parties, 
         * therefore to prevent propagation at this point would only serve to confuse.
         *
         * @param {Object} args
         *    {
         *      sourceClient:   Object,   //the client that originated the invitation
         *      targetClient:   Object,   //the client that has just declined the invitation
         *      groupName:      String    //the name of the group 
         *    }
         */
        invitationDeclined: function(args, cb) {
          feather.logger.info("An invitation has been declined for the group '" + args.groupName + "'");
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
       * Subscribe to the channel.
       *
       * Notice that you can create/join 'public' groups at subscribe-time.
       * In this example we're joining the group on the chat channel for "this page, by URL".
       */
      var chatChannel = feather.socket.subscribe("chat", {
        groups: [window.location.href],
        data: {foo: "bar"} //illustration of passing data at subscribe-time (other clients will receive this data via the connection event)
      });
      
      myapp.chat = feather.widget.create({
        name: "myapp.chat",
        path: "widgets/chat/",
        prototype: {
          initialize: function($super, options) {
            $super(options);
          },
          onReady: function() {            
            this.bindUI();   
            
            //add a secure group using a pseudo-random name (in practice, you might want to use a true uuid generator)
            //using a random group name simply bolsters security a bit, and also can help avoid naming collisions
            //since group names are first come first serve.
            chatChannel.joinGroup({
              name: feather.auth.user.username + "_" + (new Date()).getTime(),
              secure: true
            });
          },
          bindUI: function() {
            var me = this;

            //handle the main 'send message' button
            me.domEvents.bind(me.get("#sendMessageBtn"), "click", function() {              
              //send a message to only those clients that are connected via the same URL
              chatChannel.sendGroup(window.location.href, "chat", {message: "hi!"});
            });

            //when other clients connect, do something
            chatChannel.on("connection", function(args) {
              alert("another client has connected");

              //add some UI to the page to allow direct messages and group invites, etc.
              //you can use args.clientId to bake into your button ids in order to properly route direct messages and invites
              //note: use args.data here to get at any data the other client-side or the server-side hooks have added (like username)
              me.get("#userList").append("some HTML, including the username, a 'send direct message', and 'invite to group(s)' button");

              //use the clientId to bind button handlers
              me.domEvents.bind(me.get("#dmBtn_" + args.clientId, "click", function() {
                //pass an array of clientIds to .send() to route direct messages
                chatChannel.send("chat", {message: "direct hi!"}, [args.clientId]);
              }));

              me.domEvents.bind(me.get("#inviteBtn_" + args.clientId, "click", function() {
                //pass an array of clientIds to .send() to route direct messages
                chatChannel.send("chat", {message: "direct hi!"}, [args.clientId]);
              }));
            });
            
            //when I receive a chat event on the chat channel, update the UI
            chatChannel.on("chat", function(args) {
              //in a real app we'd obviously do more than just alert, but you get the idea...
              alert("Incoming chat. Message = " + args.message);
            });
          }
        }   
      });
    })();