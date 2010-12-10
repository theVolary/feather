jojo.ns("test");

test.test = jojo.widget.create({
	name: "test.test",
	path: "widgets/test/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
			this.title = options.title;
		},
		doSomething: jojo.widget.serverMethod(function(foo, bar) {
			if (jojo.logger) {
                jojo.logger.log("successfuly called server side test.test.doSomething() from the client");
            }
			return {message: "success", foo: foo, bar: bar};
		}),
		doSomething2: jojo.widget.serverMethod(function() {
			return {message: "doSomething2 success"};
		})
	}		
});
