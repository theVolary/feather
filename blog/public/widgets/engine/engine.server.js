jojo.ns("blog");
var sys = require("sys")
blog.engine = jojo.widget.create({
	name: "blog.engine",
	path: "widgets/engine/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
		},
    doSomething: jojo.widget.serverMethod(function(params, arg1, arg2) {
      return {
        clientArg1: arg1,
        clientArg2: arg2
      };
    })
	}		
});
