feather.ns("blog");

blog.header = feather.widget.create({
	name: "blog.header",
	path: "widgets/header/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		}
	}		
});
