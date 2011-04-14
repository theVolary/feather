exports.BlogApi = Class.create({
  initialize: function(options) {
    options = options || {};
  },  
  getPosts: function(callback) {
    feather.logger.info('Getting posts by date from couch.');
    feather.data.appdb.view("blogentry/posts_by_date", { descending: true }, function(err, dbResult) {
      if (!err) {
        feather.logger.info({message:'Found ' + dbResult.length + ' posts.'});
        dbResult.forEach(function(key, doc, id) {
          doc.key = key;
          doc.pubDate = new Date(key[0]-0, key[1]-0, key[2]-0, key[3]-0, key[4]-0, key[5]-0);
          doc.id = id;
          feather.logger.debug({message:'Found document w/ id ' + id + ', key ' + key});
        });
      } else {
        feather.logger.error({message:"Error getting posts from couch", exception:err});
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
  }
  
});