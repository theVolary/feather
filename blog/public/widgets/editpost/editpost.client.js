feather.ns("blog");
(function() {	

  blog.editpost = feather.Widget.create({
    name: "blog.editpost",
    path: "widgets/editpost/",
    prototype: {
      savePost: function(cb) {
        var me = this;
        var post = me.model.post; //thanks to auto datalinking, this will updated for us
        me.server_editPost([post], function(args) {
          if (args.success) {
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
      }
    }		
  });	
})();
