jojo.ns("blog");

blog.lastfive = jojo.widget.create({
  name: "blog.lastfive",
  path: "widgets/lastfive/",
  prototype: {
    initialize: function($super, options) {
      $super(options);
    },
    getPosts: function(cb) {
      var me = this;
      var posts = [];
      jojo.blog.api.getPosts(function(err, dbResult) {
        if (!err) {
          dbResult.forEach(function(key, doc, id) {
            posts.push(doc); // id, key, value { pub_date, summary, post }
          });
          cb({posts: posts});
        } else {
          cb({error: err.reason});
        }
      });
    }
  } // end prototype
});
