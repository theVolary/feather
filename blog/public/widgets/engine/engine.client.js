jojo.ns("blog");
(function() {
  
  blog.engine = jojo.widget.create({
    name : "blog.engine",
    path : "widgets/engine/",
    prototype: {
      initialize: function($super, options){
        $super(options);
      },
      onReady: function(args){
        var me = this;
        me.fsm = new jojo.fsm.finiteStateMachine({
          states: {
            initial: {
              stateStartup: function(fsm, args){
              
              },
              signedIn: function(fsm, args){
                return fsm.states.signedIn;
              }
            },
            signedIn: {
              stateStartup: function(fsm, args){

              }
            }
          }
        }); // end me.fsm
        me.toolbar.on("refresh", function() {
          me.latestposts.refreshPosts();
        });
        me.signin.on('signedIn', function(){
          if (blog.auth && (blog.auth.username == 'admin' || blog.auth.username == 'editor')) {
            me.toolbar.addButton({ name: 'new', tooltip: 'New Blog Post', after:'refresh' });
          }
        });
        me.signin.on('signedOut', function() {
          me.toolbar.removeButton({name:'new'});
        });
      }
    }
  });
})();
