jojo.ns("blog");
(function() {

	blog.blogentry = jojo.widget.create({
		name : "blog.blogentry",
		path : "widgets/blogentry/",
		prototype : {
			initialize : function($super, options) {
				$super(options);
			},
			onReady : function(args) {
				var me = this;
			}
		}
	});

})();
