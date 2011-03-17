jojo.ns("blog");

var Couch = require("../../../api/couchdb");

Couch.db.initialize({
  hostUrl: 'http://localhost',
  dbName: 'jojoblog'
});

blog.exportdb = jojo.widget.create({
	name: "blog.exportdb",
	path: "widgets/exportdb/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		},
		runExport: jojo.widget.serverMethod(function(params) {
		  var me = this;
		  params.autoResponse = false;
		  Couch.db.exportDb({}, function(err) {
		    if (err) {
		      params.result.err = err;
		      params.result.success = false;
		    } else {
		      params.result.result = 'Export complete.';
		      params.result.success = true;
		    }
		    params.client.send(params.result);
		  });
	  })
	} // end prototype
});
