feather.ns("blog");
(function() {	
	blog.editpost = feather.widget.create({
		name: "blog.editpost",
		path: "widgets/editpost/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
      onReady: function() {
        this.bindUI();
      },
      bindUI: function() {
        var me = this;
        
        me.domEvents.bind(me.get("#btnCancelSavePost"), "click", function(event) {
          me.container.hide();
        });
        
        me.domEvents.bind(me.get("#btnSavePost"), "click", function(event) {
          var post = {
            summary: me.get("#summary").val(),
            post:me.get("#post").val(),
            id:me.get("#hdnPostId").val()
          }; 
          me.server_editPost([post], function(args) {
            if (args.success) {
              me.get("#post").val('');
              me.get("#summary").val('');
              me.get("#hdnPostId").val('');
              me.container.hide();
              me.fire("postSaved");
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
                msgLine.append(args.err.message);
              }
              
            }
          });
        });
      }, // end bindUI
      show: function(post) {
        var me = this;
        me.get("#messageLine").empty();
        if (post) {
          me.get("#post").val(post.post);
          me.get("#summary").val(post.summary);
          me.get("#hdnPostId").val(post.id);
        } else {
          me.get("#post").val('');
          me.get("#summary").val('');
          me.get("#hdnPostId").val('');
        }
        me.container.show();
      }
		}		
	});	
})();
