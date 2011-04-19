feather.ns("performance_app");

performance_app.async1 = function(cb) {
  cb({foo: (new Date()).getTime()});
};

performance_app.async_1 = feather.widget.create({
	name: "performance_app.async_1",
	path: "widgets/async_1/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		}
	}		
});
