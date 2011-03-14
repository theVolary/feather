jojo.ns("blog");
(function() {

	blog.signin = jojo.widget.create({
		name: "blog.signin",
		path: "widgets/signin/",		
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
				var me = this;
				
				this.domEvents.bind(this.get("#signinButton"), "click", function() {
          me.fire('signedIn');
				});
			}
		}
	});

})();
