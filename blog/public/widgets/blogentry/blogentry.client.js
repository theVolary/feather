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
				me.server_getPost([me.blogId], function(result) {
          var container = me.container;
				  if (result.success) {
				    var post = result.result;
				    container.empty().append("<h2>" + post.summary + "</h2>\n<h3>" + new Date(post.pubDate).toString("MM/dd/yyyy hh:mm tt") + "</h3>\n<p>" + post.post + "</p>\n");
				  } else if (result.err) {
				    container.empty().append("<p> " + result.err.message + " </p>\n<pre>" + result.err.stack + "</pre>\n");
				  } else {
				    container.empty().append("<p>Unknown error</p>");
				  }
				});
			}
		}
	});

})();
