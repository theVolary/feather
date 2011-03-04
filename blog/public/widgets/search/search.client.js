jojo.ns("blog");
(function() {

	blog.search = jojo.widget.create({
		name : "blog.search",
		path : "widgets/search/",
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
