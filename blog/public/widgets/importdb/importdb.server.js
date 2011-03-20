jojo.ns("blog");

blog.importdb = jojo.widget.create({
	name: "blog.importdb",
	path: "widgets/importdb/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		},
		runImport: jojo.widget.serverMethod(function(params, overwrite) {
		  var me = this;
		  params.autoResponse = false;
		  jojo.data.appdb.importDb({overwrite: overwrite}, function(err) {
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
