feather.ns("blog");

/**
 * global static method which can also be used from within the template via an 'async' tag
 * @param {Function} cb
 */
blog.getPosts = function(cb) {
  var me = this;
  var posts = [];
  feather.blog.api.getPosts(function(err, dbResult) {
    if (!err) {
      dbResult.forEach(function(key, doc, id) {
        doc.timestamp = (new Date()).getTime(); //for testing
        posts.push(doc);
      });
      cb(null, {posts: posts, editAuthorities: ['admin', 'editor'] });
    } else {
      cb(err.reason);
    }
  });
};

blog.latestposts = feather.widget.create({
  name: "blog.latestposts",
  path: "widgets/latestposts/",
  prototype: {
    initialize: function($super, options) {
      $super(options);
      this.timestamp = (new Date()).getTime();
    },
    getPosts: feather.widget.serverMethod(function(cb) {
      var me = this;
      blog.getPosts(function(err, result) {
        if (err) {
          cb(err);
        } else {
          cb(null, result);
        }
      });
    })
  } // end prototype
});
