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
		getPost: feather.widget.serverMethod(function(params, blogId) {
		  var me = this;
		  params.autoResponse = false;
		  feather.blog.api.getPost(blogId, function(err, result) {
		    feather.logger.trace("getPost err is " + err);
		    debugger;
		    if (err) {
		      params.result.err = err;
		      params.result.success = false;
//		    me.blogPost = { err: err, summary:'', content:'', pubDate:'' };
		    } else {
//		      me.blogPost = result;
          params.result.result = result;
		    }
		    params.client.send(params.result);
		  });
		})
	}		
});
