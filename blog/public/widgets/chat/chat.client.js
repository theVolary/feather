(function() {
  
  jojo.ns("blog");
  
  //create a comm channel to route chat messages through
  var chatChannel = jojo.socket.addChannel("blog.chat"); //NOTE: the name could be keyed by page name/etc... 
  
  var messageTemplate = [
    '<div class="message">',
      '<span class="namelabel">${name} :</span>',
      '<span>${message}</span>',
    '</div>'
  ].join('');

  blog.chat = jojo.widget.create({
    name: "blog.chat",
    path: "widgets/chat/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      },
      onReady: function() {
        var me = this,
            domEvents = this.domEvents,
            namebox = me.get("#namebox"),
            chatbox = me.get("#chatbox");
        
        /**
         * simple ui behaviors
         */
        namebox.focus(function() {
          namebox.unbind();
          namebox[0].value = "";
          namebox.removeClass("grey");
        });
        
        chatbox.focus(function() {
          chatbox.unbind();
          chatbox[0].value = "";
          chatbox.removeClass("grey");
        });
        
        /**
         * binding the chat button to update local ui 
         * as well as broadcast to other clients that might be connected
         */
        domEvents.bind(me.get("#chatBtn"), "click", function() {
          var data = {
            message: chatbox[0].value,
            name: namebox[0].value
          };
          me.newMessage(data);
          chatChannel.fire("chat", data);
        });
        
        /**
         * resond to other clients' messages
         */
        chatChannel.on("chat", function(args) {
          me.newMessage({
            name: args.name,
            message: args.message
          });
        });
      },
      newMessage: function(data) {
        $.tmpl(messageTemplate, data).appendTo(this.get("#conversation"));
      }
    } // end prototype
  });
})();
