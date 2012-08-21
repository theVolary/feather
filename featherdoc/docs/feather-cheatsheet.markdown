# Feather Cheat Sheet

## App

## Widgets

Create a Widget

`feather create-widget [namespace] widgetName`

### Server-Side

Template

    exports.getWidget = function(feather, cb) {
      cb(null, {
	    name: "namespace.widgetName",
	    path: "widgets/widgetName/",
	    // prototype: {} goes here
	  });
	};

Available Prototype Methods

    prototype: {
	  onInit: function(options) { },
	  onRender: function() { },
	  customServerMethod: feather.Widget.serverMethod(function(arg1, arg2, argN, cb)) {
	  	cb && cb(err, result);
	  }
	}


### Client-Side

Available Prototype Methods

    prototype: {
      onInit: function() { },
      onReady: function() { }
    }

Call a server RPC method

    this.server_customServerMethod([arg1, arg2, argN], function(response) {});

Server RPC Method Response Object

    var response = {
      messageId: String,
      type: "rpc",
      err: Object_or_String,
      success: boolean,
      result: Object
    };
    
Reference a Child Widget

    this.childWidgetIdFromWidgetTag

Dynamically Load a Widget

    feather.Widget.load({
      path: "widgets/your_widget_sub_path/",
      serverOptions: {
        // contents will be made available to server side of widgets as this.options
      },
      clientOptions: {
        parent: me, // typical default
        container: me.container, // typical default
        keepContainerOnDispose: false, // false removes container on dispose.  true just empties it.
        containerOptions: {
          containerizer: someObj, // Normally you won't need this
          title: "",
          width: 800,
          height: 600
        },
        on: {
          someEvent: function(sender) {}
        },
        once: {
          someEvent: function() {}
        },
        onceState: {a
          ready: function() {}
        }
      }
    });