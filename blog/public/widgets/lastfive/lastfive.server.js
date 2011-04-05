jojo.ns("blog");

blog.lastfive = jojo.widget.create({
  name: "blog.lastfive",
  path: "widgets/lastfive/",
  prototype: {
    initialize: function($super, options) {
      $super(options);
      //this.getPosts();
    },
    getPosts: jojo.widget.serverMethod(function(params) {
      var me = this;
      var posts = [];
      params.autoResponse = false; // We'll handle the sending of data back to the client.
      jojo.blog.api.getPosts(function(err, dbResult) {
        if (!err) {
          dbResult.forEach(function(key, doc, id) {
            posts.push(doc); // id, key, value { pub_date, summary, post }
          });
          params.result.success = true;
          params.result.result = posts;
        } else {
          params.result.success = false;
          params.result.err = err;
        }
        params.client.send(params.result);
      });
    }) // end getPosts
  } // end prototype
});
