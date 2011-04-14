feather.ns("blog");

blog.search = feather.widget.create({
	name: "blog.search",
	path: "widgets/search/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		}
	}		
});
