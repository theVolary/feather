jojo.ns("blog");
var url = require("url");

blog.blogentry = jojo.widget.create({
	name: "blog.blogentry",
	path: "widgets/blogentry/",
	prototype: {
	  blogId: null,
		initialize: function($super, options) {
			$super(options);
			var me = this;
			if (jojo.request.url) { 
			  var params = url.parse(jojo.request.url, true).query;
			  me.blogId = params.id;
		  }
		},
		onRender: function() {
		  this.renderOnInitScript("widget.blogId = '" + this.blogId+ "';");
		},
		getPost: jojo.widget.serverMethod(function(params, blogId) {
		  var me = this;
		  params.autoResponse = false;
		  jojo.blog.api.getPost(blogId, function(err, result) {
		    jojo.logger.trace("getPost err is " + err);
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
