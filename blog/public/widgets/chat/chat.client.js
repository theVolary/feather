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
      notifier: null,
      initialize: function($super, options) {
        $super(options);
        if (Audio) {
          this.notifier = new Audio();
          this.notifier.src = '/widgets/chat/notify.wav';
          this.notifier.load();
        }
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
          chatbox.unbind('focus');
          chatbox[0].value = "";
          chatbox.removeClass("grey");
        });
        
        var sendMessage = function() {
          var data = {
            message: chatbox[0].value,
            name: namebox[0].value,
            remote: false
          };
          me.newMessage(data);
          chatChannel.fire("chat", data);
        }
        
        /**
         * binding the chat button to update local ui 
         * as well as broadcast to other clients that might be connected
         */
        domEvents.bind(me.get("#chatBtn"), "click", sendMessage);
        domEvents.bind(chatbox, "keyup", function(e) {
          var e = window.event || e;
          if (e.keyCode == 13) {
            sendMessage();
          }
        });
        
        /**
         * resond to other clients' messages
         */
        chatChannel.on("chat", function(args) {
          me.newMessage({
            name: args.name,
            message: args.message,
            remote: true
          });
        });
      },
      newMessage: function(data) {
        var conversation = this.get("#conversation");
        $.tmpl(messageTemplate, data).appendTo(conversation);
        conversation.scrollTop(conversation.height());
        if (data.remote && this.notifier) {
          this.notifier.load();
          this.notifier.play();
        }
      }
    } // end prototype
  });
})();
