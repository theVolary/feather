jojo.ns("blog");
(function() {
  
  blog.engine = jojo.widget.create({
    name : "blog.engine",
    path : "widgets/engine/",
    prototype: {
      initialize: function($super, options){
        $super(options);
      },
      checkUser: function() {
        var me = this;
        if (jojo.auth.user && (jojo.auth.user.hasAnyAuthority(['admin', 'editor']))) {
          me.toolbar.addButton({ name: 'new', tooltip: 'New Blog Post', after:'refresh' });
        }
      },
      onReady: function(args){
        var me = this;
        me.checkUser();
        me.toolbar.on("refresh", function() {
          me.latestposts.refreshPosts();
        });
        jojo.auth.api.on('authenticated', function() {
          me.checkUser();
        });
        jojo.auth.api.on('loggedOut', function() {
          me.toolbar.removeButton({name:'new'});
        });
      }
    }
  });
})();
