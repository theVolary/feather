feather.ns("blog");

(function() {
  
  blog.engine = feather.Widget.create({
    name : "blog.engine",
    path : "widgets/engine/",
    prototype: {
      checkUser: function() {
        var me = this;
        if (feather.auth.user && (feather.auth.user.hasAnyAuthority(['admin', 'editor']))) {
          me.toolbar.addButton({ name: 'new', tooltip: 'New Blog Post', after:'refresh' });
        }
      },
      onReady: function(args){
        var me = this;
        me.checkUser();
        me.toolbar.on("refresh", function() {
          me.latestposts.refreshPosts();
        });
        me.toolbar.on("new", function() {
          me.editPost();
        });
        me.latestposts.on("editPost", function(args) {
          me.editPost(args.post);
        });
        feather.auth.api.on('authenticated', function() {
          me.checkUser();
        });
        feather.auth.api.on('loggedOut', function() {
          me.toolbar.removeButton({name:'new'});
        });
      },
      editPost: function(post) {
        var me = this;
        var id = feather.id();
        var title = post == null ? "New Post" : post.parent_id != null ? "Reply to Post" : "Edit Post";
        feather.Widget.load({
          id: id,
          path: "widgets/editpost/",
          clientOptions: {
            model: {post: post},
            containerOptions: {
              title: title,
              width: 800,
              height: 350,
              modal: true,
              buttons: {
                SAVE: function() {
                  var w = feather.Widget.widgets.findById(id);
                  w.savePost(function(err) {
                    if (!err) {
                      w.dispose();
                      me.latestposts.refreshPosts();
                    }
                  });
                },
                Cancel: function() {
                  var w = feather.Widget.widgets.findById(id);
                  w.dispose();
                }
              }
            }
          }
        });
      }
    }
  });
})();
