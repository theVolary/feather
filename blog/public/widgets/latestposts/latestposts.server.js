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
        var replies={};
        dbResult.forEach(function(key, doc, id) {
          doc.formattedPubDate = new Date(doc.pubDate).toString("yyyy-MM-dd HH:mm:ss");  // Nice formatting
          if (doc.level==undefined || doc.level=="0")
          {
            if (replies[id]==undefined)
              replies[id]=[];
            doc.replies = replies[id];
            posts.push(doc);
            replies=[];
          }
          else
          {
            if (replies[doc.parent_id]==undefined)
              replies[doc.parent_id]=[];
            replies[doc.parent_id].push(doc);
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