jojo.ns("test");
(function() {	
	
	test.persevereTest = jojo.widget.create({
		name: "test.persevereTest",
		path: "widgets/persevereTest/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function() {
				var me = this;
				me.domEvents.observe(me.$("testBtn"), "click", function() {
					me.server.testClass(function(args) {
						//alert(Object.toJSON(args));
						alert("test1 done");
					});
				});
				me.domEvents.observe(me.$("testBtn2"), "click", function() {
					me.server.testClass2(function(args) {
						alert(Object.toJSON(args));
					});
				});
				me.domEvents.observe(me.$("testBtn3"), "click", function() {
					//make the call right from here
					var sendOptions = new Jaxer.XHR.SendOptions();
					sendOptions.url = jojo.appOptions.persevere.root + "Class/";
					sendOptions.method = "GET";
					sendOptions.cacheBuster = false;
					sendOptions.headers = {
						Accept: "application/javascript"
					};
					sendOptions.onsuccess = function(response) {
						var classes = eval("(" + response + ")");
						alert(Object.toJSON(classes));
					};
					Jaxer.XHR.send("", sendOptions);
				});
				me.domEvents.observe(me.$("testBtn4"), "click", function() {
					jojo.data.loadClasses("test", function(result) {
						debugger;
						var test1 = new entities.test.instance();
						test1.data.sayHi(); //TODO: how do we deal with methods elegantly?
						alert(Object.toJSON(test1.data));
					});
				});
				me.domEvents.observe(me.$("testBtn5"), "click", function() {
					jojo.data.loadClasses("test", function(result) {
						var test1 = new entities.test.instance();
						test1.data.foo2 = 456;
						test1.save(function(result) {
							alert(Object.toJSON(test1.data));
						});
					});
				});
				me.domEvents.observe(me.$("testBtn6"), "click", function() {
					jojo.data.loadClasses("test", function(result) {
						var test1 = new entities.test.instance();
						test1.data.foo2 = 456;
						alert(Object.toJSON(test1.data));
						test1.save(function(result) { // this will be a POST/create operation because our instance's .isNew property is true
							alert(Object.toJSON(test1.data));
							test1.data.foo2 = 789;
							test1.save(function() { // this will be a PUT/update operation because our instance's .isNew property is now false
								alert(Object.toJSON(test1.data));
							});
						});
					});
				});
				me.domEvents.observe(me.$("testBtn7"), "click", function() {
					jojo.data.loadClasses("test", function(result) {
						var test1 = new entities.test.collection();
						test1.load(function(result) {
							//debugger; //inspect test1.items array to see if the data was loaded (.data property)
						});
					});
				});
				me.domEvents.observe(me.$("testBtn8"), "click", function() {
					jojo.data.loadClasses("test", function(result) {
						var test1 = new entities.test.collection();
						test1.load(function(result) {
							debugger;
							test1.each(function(instance) { // add a new property to each instance
								instance.data.newprop = jojo.id();
							});
							test1.save(function(result) { //batch update all items in a single request
								debugger; //inspect test.items array to see if newprop exists on all the items (.data property)
							});
						});
					});
				});
				me.domEvents.observe(me.$("testBtn9"), "click", function() {
					jojo.data.loadClasses("test", function(result) {
						var test1 = new entities.test.collection();
						test1.load({
							query: "?foo2=789",
							callback: function(result) {
								//debugger;
							}
						});
					});
				});
			}
		}		
	});
	
})();
