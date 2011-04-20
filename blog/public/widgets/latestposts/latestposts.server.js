feather.ns("blog");

/**
 * global static method which can also be used from within the template via an 'async' tag
 * @param {Object} cb
 */
blog.getPosts = function(cb) {
  var me = this;
  var posts = [];
  feather.blog.api.getPosts(function(err, dbResult) {
    if (!err) {
      dbResult.forEach(function(key, doc, id) {
        doc.timestamp = (new Date()).getTime(); //for testing
        posts.push(doc); // id, key, value { pub_date, summary, post }
      });
      cb({posts: posts});
    } else {
      cb({error: true, message: err.reason});
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
      blog.getPosts(function(result) {
        if (result.error) {
          cb(result.message);
        } else {
          cb(null, result);
        }
      });
    })
  } // end prototype
});
