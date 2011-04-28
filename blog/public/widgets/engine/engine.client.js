feather.ns("blog");
(function() {
  
  blog.engine = feather.widget.create({
    name : "blog.engine",
    path : "widgets/engine/",
    prototype: {
      initialize: function($super, options){
        $super(options);
      },
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
          me.editPost.show();
        });
        me.latestposts.on("editPost", function(args) {
          me.editPost.show(args);
        });
        me.editPost.on("postSaved", function() {
          me.latestposts.refreshPosts();
        });
        feather.auth.api.on('authenticated', function() {
          me.checkUser();
        });
        feather.auth.api.on('loggedOut', function() {
          me.toolbar.removeButton({name:'new'});
        });
      }
    }
  });
})();
