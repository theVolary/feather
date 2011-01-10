jojo.ns("test");
(function() {	

	test.test = jojo.widget.create({
		name: "test.test",
		path: "widgets/test/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
				var me = this;
				this.domEvents.bind(this.get("#testBtn"), "click", function() {
					debugger;
          me.server_doSomething(["foo param", {
						prop1: "prop1"
					}], function(args) {
						alert(Object.toJSON(args));
					});
				});
				this.domEvents.bind(this.get("#testBtn2"), "click", function() {
					me.server_doSomething2(function(args) {
						alert(Object.toJSON(args));
					});
				});
			}
		}		
	});
	
})();
