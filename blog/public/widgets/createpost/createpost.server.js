feather.ns("blog");
blog.createpost = feather.widget.create({
	name: "blog.createpost",
	path: "widgets/createpost/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		},
    createPost: feather.widget.serverMethod(function(post, cb) {
      feather.blog.api.createPost(post, function(err, result) {
        cb && cb(err, result);
      });
    })
	}		
});
