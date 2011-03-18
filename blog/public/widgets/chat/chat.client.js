(function() {
  
  jojo.ns("blog");
  
  //create a comm channel to route chat messages through
  var chatChannel = jojo.socket.addChannel("blog.chat"); //NOTE: the name could be keyed by page name/etc... 

  blog.chat = jojo.widget.create({
    name: "blog.chat",
    path: "widgets/chat/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      },
      onReady: function() {
        var me = this,
            domEvents = this.domEvents;
        
        domEvents.bind(me.get("#chatBtn"), "click", function() {
          chatChannel.fire("chat", {message: me.get("#chatbox")[0].value});
        });
        
        chatChannel.on("chat", function(args) {
          debugger;
        });
      }
    } // end prototype
  });
})();
