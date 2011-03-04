jojo.ns("blog");
(function() {	

	blog.header = jojo.widget.create({
		name: "blog.header",
		path: "widgets/header/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
				var me = this;
				//document.title = me.options.title;
			}
		}		
	});
	
})();
