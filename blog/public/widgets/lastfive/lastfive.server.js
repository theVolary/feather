jojo.ns("blog");

var Couch = require("../../../api/couchdb");
var sys = require("sys");

Couch.db.initialize({
  hostUrl: 'http://zqdppapp06.zyquest.com',
  dbName: 'jojoblog'
});

blog.lastfive = jojo.widget.create({
	name: "blog.lastfive",
	path: "widgets/lastfive/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
			this.getPosts();
		},
    getPosts: function() {
      var me = this;
      jojo.request.suppress(["data", "end"], true);
      Couch.db.view("blogentry/posts_by_date", { callback:function(err, res) {
        var posts = [];
        if (err) {
          sys.puts(err.error + ": " + err.reason);
        } else {
          sys.puts("docs (" + res.length + "): ");
          res.forEach(function(doc) {
            sys.puts("doc: " + doc.summary)
            posts.push(doc); // id, key, value { pub_date, summary, post }
          });
        }
        // add posts to dom.
        var lf = me.get("#lastFiveList").append("<li>Hi Mom!</li>");
        jojo.request.unsuppress();
      }, descending: true });
    } // end getPosts
	}		
});
