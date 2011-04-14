feather.ns("blog");

blog.exportdb = feather.widget.create({
	name: "blog.exportdb",
	path: "widgets/exportdb/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		},
		runExport: feather.widget.serverMethod(function(params) {
		  var me = this;
		  params.autoResponse = false;
		  feather.data.appdb.exportDb({}, function(err) {
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
