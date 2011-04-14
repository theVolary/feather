feather.ns("blog");

blog.importdb = feather.widget.create({
	name: "blog.importdb",
	path: "widgets/importdb/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		},
		runImport: feather.widget.serverMethod(function(params, overwrite) {
      debugger;
		  var me = this;
		  params.autoResponse = false;
		  feather.data.appdb.importDb({overwrite: overwrite}, function(err) {
        debugger;
		    if (err) {
		      params.result.err = err;
		      params.result.success = false;
		    } else {
		      params.result.result = 'Import complete.';
		      params.result.success = true;
		    }
		    params.client.send(params.result);
		  });
	  })
	}		
});
