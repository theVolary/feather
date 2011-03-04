jojo.ns("blog");
(function() {

	blog.engine = jojo.widget.create({
		name : "blog.engine",
		path : "widgets/engine/",
		prototype : {
			initialize : function($super, options) {
				$super(options);
			},
			onReady : function(args) {
				var me = this;

				me.fsm = new jojo.fsm.finiteStateMachine({
					states: {
						initial: {
							stateStartup: function(fsm, args) {
								
							},
							signedIn: function(fsm, args) {
								return fsm.states.signedIn;
							}
						},
						signedIn: {
							stateStartup: function(fsm, args) {
                me.signin.dispose();
							}
						}
					}
				}); // end me.fsm
				
				me.signin.on('signedIn', function() {
					me.fsm.fire('signedIn');
				});
			}
		}
	});

})();
