feather.ns("blog");
blog.editpost = feather.widget.create({
	name: "blog.editpost",
	path: "widgets/editpost/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		},
    editPost: feather.widget.serverMethod(function(post, cb) {
      var sess = this.request.session;
      if (sess && sess.user && sess.user.hasAnyAuthority(['editor', 'admin'])) {
        feather.blog.api.savePost(post, function(err, result) {
          cb && cb(err, result);
        });
      } else {
        cb && cb('You do not have permission to edit posts.');
      }
    })
	}		
});
