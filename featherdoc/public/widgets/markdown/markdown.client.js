feather.ns("featherdoc");
(function() {	
	featherdoc.markdown = feather.widget.create({
		name: "featherdoc.markdown",
		path: "widgets/markdown/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			}
		}		
	});	
})();
