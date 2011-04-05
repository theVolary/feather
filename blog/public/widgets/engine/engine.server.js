jojo.ns("blog");
var sys = require("sys"),
    test = require("require_test"),
    subtest = require("sublib/require_sub_test");
blog.engine = jojo.widget.create({
	name: "blog.engine",
	path: "widgets/engine/",
	prototype: {
		initialize: function($super, options) {
			$super(options);
			jojo.logger.warn('test is ' + test.myMethod);
			jojo.logger.warn("subtest is " + subtest.mySubMethod);
		},
    onRender: function() {
      //send data to client side instance
      this.renderOnInitScript("widget.foo = 'data from server';");
    },
    onReady: {
      //jojo.logging.logger.registerTemplate('dump.function.args', 'Function ${name} args: [${args}]');
    },
    doSomething: jojo.widget.serverMethod(function(params, arg1, arg2) {
      /*jojo.logging.logger.info('engine widget doing something'); // global category.  No templating.
      jojo.logging.logger.info({message:'engine widget doing something', category:'engine.widget'}); // specific category.  No templating.
      jojo.logging.logger.info({message:'engine widget doing something with ${arg1}, ${arg2}', replacements:{arg1:arg1, arg2:arg2}, category:'engine.widget'}); // specific category.  templated message
      jojo.logging.logger.info({message:'engine widget doing something with ${0}, ${1}', replacements: [arg1, arg2], category: 'engine.widget'}); // specific category.  templated message 
      jojo.logging.logger.info({template:'dump.function.args', replacements:arguments});
      
      // Also possible:
      jojo.logging.logger.info('engine widget doing something with ' + arg1 + ', ' + arg2);*/
      return {
        clientArg1: arg1,
        clientArg2: arg2
      };
    })
	}		
});
