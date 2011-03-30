exports.BlogApi = Class.create({
  initialize: function(options) {
    options = options || {};
  },  
  getPosts: function(callback) {
    jojo.logger.info('Getting posts by date from couch.');
    jojo.data.appdb.view("blogentry/posts_by_date", { descending: true }, function(err, dbResult) {
      if (!err) {
        jojo.logger.info({message:'Found ${cnt} posts.', replacements:{cnt:dbResult.length}});
        dbResult.forEach(function(key, doc, id) {
          doc.key = key;
          doc.pubDate = new Date(key[0], key[1], key[2], key[3], key[4], key[5]);
          doc.id = id;
          jojo.logger.debug({message:'Found document w/ id ${id}, key ${key}', replacements:doc});
        });
      } else {
        jojo.logger.error(err);
      }
      callback(err, dbResult);
    }); // end couch.db.view
  }
  
});