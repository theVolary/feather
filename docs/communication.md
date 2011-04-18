# feather client/server communication models #

## Overview ##
Once a feather page has been served to a client, there are several ways in which you can communicate with the server, and with other connected clients. At the core of feather's communications lies the excellent [socket.io](http://socket.io) library. This means we have full support for the WebSocket protocol, assuming the client supports it. It also means we have full support for server push, as well as client broadcasting of messages. The channel abstraction allows for a pub/sub event model for real-time communications, while the feather.widget.widgetServerMethod construct enables seamless widget-level RPC style communications.

## Widget-level RPC ##
If you'd like to encapsulate server-side methods within a given widget, there is an easy mechanism for doing so: feather.widget.widgetServerMethod(). When you wrap a method as a widgetServerMethod, a corresponding proxy method will be emitted to the client, which can be used to invoke the server method seamlessly.

_Example_:

  If your have a widget 'foo', and foo.server.js looks like this:
    feather.ns("myapp");    
    myapp.foo = feather.widget.create({
	name: "myapp.foo",
	path: "widgets/foo/",
	prototype: {
          initialize: function($super, options) {
            $super(options);
          }
        }		
     });
