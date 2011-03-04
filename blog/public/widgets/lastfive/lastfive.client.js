jojo.ns("blog");
(function() {

	blog.lastfive = jojo.widget.create({
		name : "blog.lastfive",
		path : "widgets/lastfive/",
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
