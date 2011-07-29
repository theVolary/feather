exports.getWidget = function(feather, cb) {
  
  //TODO: find an elegant way around global static method dependency in dynamic tags
  
  //use ns when you need a global context object
  feather.ns("blog");

  /**
   * global static method which can also be used from within the template via a 'dynamic' tag
   * @param {Function} cb
   */
  blog.getPosts = function(_cb) {
    var me = this;
    var posts = [];
    feather.blog.api.getPosts(function(err, dbResult) {
      if (!err) {
        dbResult.forEach(function(key, doc, id) {
          if (key[0]=="post")
          {
            doc.timestamp = (new Date()).getTime(); //for testing
            posts.push(doc);
          }
        });
        _cb(null, {
          posts: posts, 
          editAuthorities: ['admin', 'editor']
        });
      } else {
        _cb(err.reason);
      }
    });
  };

  cb(null, {
    name: "blog.latestposts",
    path: "widgets/latestposts/",
    prototype: {
      onInit: function(options) {
        this.timestamp = (new Date()).getTime();
      },
      getPosts: feather.Widget.serverMethod(function(_cb) {
        var me = this;
        blog.getPosts(function(err, result) {
          if (err) {
            _cb(err);
          } else {
            _cb(null, result);
          }
        });
      })
    } // end prototype
  });
};