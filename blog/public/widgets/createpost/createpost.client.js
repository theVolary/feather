feather.ns("blog");
(function() {	
	blog.createpost = feather.widget.create({
		name: "blog.createpost",
		path: "widgets/createpost/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
      onReady: function() {
        this.bindUI();
      },
      bindUI: function() {
        var me = this;
        
        me.domEvents.bind(me.get("#btnCancelCreatePost"), "click", function(event) {
          me.container.hide();
        });
        
        me.domEvents.bind(me.get("#btnCreatePost"), "click", function(event) {
          var post = {
            summary: me.get("#summary").val(),
            post:me.get("#post").val()
          }; 
          me.server_createPost(post, function(args) {
            if (args.success) {
              me.get("#post").val('');
              me.get("#summary").val('');
              me.container.hide();
              me.fire("postCreated");
            } else {
              var msgLine = me.get("#messageLine");
              msgLine.empty();
              if (args.err.validationErrors) {
                msgLine.append("<p>" + args.err.message + "</p>");
                var ul = $('<ul></ul>').appendTo(msgLine);
                for (var i = 0; i < args.err.validationErrors.length; i++) {
                  ul.append("<li>"+args.err.validationErrors[i]+"</li>");
                }
              } else {
                msgLine.append(args.err);
              }
              
            }
          });
        });
      }
		}		
	});	
})();
