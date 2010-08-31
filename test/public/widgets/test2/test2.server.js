jojo.ns("test");
(function() {

	test.test2 = jojo.widget.create({
		name: "test.test2",
		path: "widgets/test2/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			}
		}		
	});
})();
