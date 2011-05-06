feather.ns("blog");
(function() {	

  //TODO: would be good to have automatic two-way data binding between the post (model) and the ui elements

	blog.editpost = feather.widget.create({
		name: "blog.editpost",
		path: "widgets/editpost/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
        this.post = options.post;
			},
      onReady: function() {
        if (this.post) this.showPost(this.post);
      },
      savePost: function(cb) {
        var me = this;
        
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
            me.fire("postSaved", {post: post});
            cb && cb(null, post);
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
      }, // end savePost
      showPost: function(post) {
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
      }
		}		
	});	
})();
