jojo.ns("blog");
(function() {
  
  blog.entries = [];

  blog.entries = [
      {
        id : '1',
        summary : 'The JoJo Blog is Born',
        pubDate : new Date(2011, 2, 03, 22, 30),
        content : 'Today the JoJo Blog was born.  Long may it live.'
      },
      {
        id : '2',
        summary : 'Getting Widgetized',
        pubDate : new Date(2011, 2, 4, 13),
        content : 'This morning I worked on turning the JoJo Blog into a fully widget-ized jojojs app.'
      },
      {
        id : '3',
        summary : 'Adding more entries',
        pubDate : new Date(2011, 2, 4, 15),
        content : 'This morning I worked on turning the JoJo Blog into a fully widget-ized jojojs app.'
      },
      {
        id : '4',
        summary : 'Entry Number 4',
        pubDate : new Date(2011, 2, 04, 15, 1),
        content : 'This morning I worked on turning the JoJo Blog into a fully widget-ized jojojs app.'
      },
      {
        id : '5',
        summary : 'Entry number 5',
        pubDate : new Date(2011, 2, 04, 15, 2),
        content : 'This morning I worked on turning the JoJo Blog into a fully widget-ized jojojs app.'
      }, {
        id : '6',
        summary : 'Entry Number 6',
        pubDate : new Date(2011, 2, 04, 15, 3),
        content : 'Lorem ipsum and stuff.'
      } ];

  blog.entries.sort(function(a, b) {
    return b.pubDate - a.pubDate;
  });
  blog.engine = jojo.widget.create({
    name : "blog.engine",
    path : "widgets/engine/",
    prototype: {
      initialize: function($super, options){
        $super(options);
      },
      onReady: function(args){
        var me = this;
        //alert(this.foo);
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
          me.lastfive.refreshPosts();
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
