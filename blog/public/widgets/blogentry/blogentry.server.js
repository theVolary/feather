feather.ns("blog");
var url = require("url");

blog.blogentry = feather.widget.create({
	name: "blog.blogentry",
	path: "widgets/blogentry/",
	prototype: {
	  blogId: null,
		initialize: function($super, options) {
			$super(options);
			var me = this;
			if (feather.request.url) { 
			  var params = url.parse(feather.request.url, true).query;
			  me.blogId = params.id;
		  }
		},
		onRender: function() {
		  this.renderOnInitScript("widget.blogId = '" + this.blogId+ "';");
		},
		getPost: feather.widget.serverMethod(function(blogId, cb) {
		  var me = this;
		  feather.blog.api.getPost(blogId, cb);
		})
	}		
});
