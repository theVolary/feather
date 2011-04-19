feather.ns("blog");

blog.exportdb = feather.widget.create({
	name: "blog.exportdb",
	path: "widgets/exportdb/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		},
		runExport: feather.widget.serverMethod(function(cb) {
		  var me = this;
		  feather.data.appdb.exportDb({}, function(err) {
		    cb(err, "Export Complete.");
		  });
	  })
	} // end prototype
});
