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
    prototype : {
		initialize : function($super, options) {
			$super(options);
    //testing...
    //this.server_doSomething([123, 456], function(result) {
	//});
		},
      onReady : function(args) {
        var me = this;
        me.fsm = new jojo.fsm.finiteStateMachine({
          states : {
            initial : {
              stateStartup : function(fsm, args) {

              },
              signedIn : function(fsm, args) {
                return fsm.states.signedIn;
              }
            },
            signedIn : {
              stateStartup : function(fsm, args) {
                me.server_doSomething([12, 42], function(response) {
                  alert('done with ' + response.result.clientArg1 + ', ' + response.result.clientArg2);
                });
                //if (console) console.log("disposing of signin");
                me.signin.dispose();
              }
            }
          }
        }); // end me.fsm

         me.signin.on('signedIn', function() { me.fsm.fire('signedIn'); });
         
      }
    }
  });

})();
