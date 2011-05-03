exports.BlogApi = Class.create({
  initialize: function(options) {
    options = options || {};
  },  
  getPosts: function(callback) {
    feather.logger.info({message:'Getting posts by date from couch.',category:'blog.api'});
    feather.data.appdb.view("blogentry/posts_by_date", { descending: true }, function(err, dbResult) {
      if (!err) {
        feather.logger.info({message:'Found ' + dbResult.length + ' posts.', category:'blog.api'});
        dbResult.forEach(function(key, doc, id) {
          doc.key = key;
          doc.pubDate = new Date(key[0]-0, key[1]-0, key[2]-0, key[3]-0, key[4]-0, key[5]-0);
          doc.id = id;
          feather.logger.debug({message:'Found document w/ id ' + id + ', key ' + key, category:'blog.api'});
        });
      } else {
        feather.logger.error({message:"Error getting posts from couch", exception:err, category:'blog.api'});
      }
      if (callback) {
        callback(err, dbResult);
      }
    }); // end couch.db.view
  },
  getPost:function(id, callback) {
    feather.logger.info("Getting post " + id);
    feather.data.appdb.get(id, function(err, doc) {
      if (!err) {
        doc.pubDate = new Date(doc.pub_date[0]-0, doc.pub_date[1]-0, doc.pub_date[2]-0, doc.pub_date[3]-0, doc.pub_date[4]-0, doc.pub_date[5]-0);
      }
      callback(err, doc);
    });
  },
  savePost: function(post, callback) {
    feather.logger.info({message: 'Creating post titled ${summary} with id ${id}', replacements:post, category:'blog.api'});
    var dbDoc = {
      summary:post.summary,
      post:post.post,
      pub_date:(new Date()).toArray()
    };
    var errors = this.postIsInvalid(post);
    if (errors) {
      callback && callback({message:"Post has validation errors.", validationErrors:errors});
    } else {
      if (post.id) {
        feather.data.appdb.save(post.id, dbDoc, function(err, results) {
          callback && callback(err, results);
        });
      } else {
        feather.data.appdb.save(dbDoc, function(err, results) {
          callback && callback(err, results);
        });
      }
    }
  },
  postIsInvalid: function(post) {
    var result = [];
    if (!post) {
      return ["Post is not a valid document."]; 
    }
    if (!post.summary) {
      result.push("Summary is required.");
    } else if(typeof(post.summary) !== "string" || post.summary.match(/^\s*$/) !== null) {
      result.push("Summary must be a non-empty string.");
    }
    if (!post.post) {
      result.push("Post text is required.");
    } else if (typeof(post.post) !== "string" || post.post.match(/^\s*$/) !== null) {
      result.push("Post must be a non-empty string.");
    }
    if (result.length === 0) return null;
    return result;
  }
  
});