jojo.ns("blog");
(function() {

	blog.engine = jojo.widget.create({
		name : "blog.engine",
		path : "/widgets/engine/",
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
