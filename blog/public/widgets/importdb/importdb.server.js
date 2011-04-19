feather.ns("blog");

blog.importdb = feather.widget.create({
	name: "blog.importdb",
	path: "widgets/importdb/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		},
		runImport: feather.widget.serverMethod(function(overwrite, cb) {
		  var me = this;
		  feather.data.appdb.importDb({overwrite: overwrite}, function(err) {
        cb(err, "Import complete.");
		  });
	  })
	}		
});
