exports.BlogApi = Class.create({
  initialize: function(options) {
    options = options || {};
  },  
  getPosts: function(callback) {
    jojo.logger.info('Getting posts by date from couch.');
    jojo.data.appdb.view("blogentry/posts_by_date", { descending: true }, function(err, dbResult) {
      if (!err) {
        jojo.logger.info({message:'Found ' + dbResult.length + ' posts.'});
        dbResult.forEach(function(key, doc, id) {
          debugger;
          doc.key = key;
          doc.pubDate = new Date(key[0]-0, key[1]-0, key[2]-0, key[3]-0, key[4]-0, key[5]-0);
          doc.id = id;
          jojo.logger.debug({message:'Found document w/ id ' + id + ', key ' + key});
        });
      } else {
        jojo.logger.error(err);
      }
      if (callback) {
        callback(err, dbResult);
      }
    }); // end couch.db.view
  }
  
});