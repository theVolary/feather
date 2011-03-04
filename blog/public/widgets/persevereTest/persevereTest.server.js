jojo.ns("test");
(function() {
	
	test.persevereTest = jojo.widget.create({
		name: "test.persevereTest",
		path: "widgets/persevereTest/",
		prototype: {
			sendOptions: new Jaxer.XHR.SendOptions(),
			initialize: function($super, options) {
				$super(options);
			},
			testClass: jojo.widget.serverMethod(function() {
				var classes = Jaxer.Web.get(jojo.appOptions.persevere.root + "Class", this.sendOptions);
				//classes = eval("(" + classes + ")");
				//jojo.debug.dump("classes", classes);
				return {json: classes};
			}),
			testClass2: jojo.widget.serverMethod(function() {
				var classes = Jaxer.Web.get(jojo.appOptions.persevere.root + "Class/", this.sendOptions);
				//classes = eval("(" + classes + ")");
				//jojo.debug.dump("classes", classes);
				return classes;
			}),
			getTemplate: function(options) {
				return <>
					<p>
						<div>
							<b>Persevere Test Widget 1</b>
							<input type="button" id={this.id + '_testBtn'} value="/Class" />
							<input type="button" id={this.id + '_testBtn2'} value="/Class/" />
							<input type="button" id={this.id + '_testBtn3'} value="client call to /Class/" />
							<input type="button" id={this.id + '_testBtn4'} value="jojo.data.loadClasses('test')" />
							<input type="button" id={this.id + '_testBtn5'} value="load and save a test object" />
							<input type="button" id={this.id + '_testBtn6'} value="load/save/update test object" />
							<input type="button" id={this.id + '_testBtn7'} value="load test.collection" />
							<input type="button" id={this.id + '_testBtn8'} value="load/alter/save test.collection" />
							<input type="button" id={this.id + '_testBtn9'} value="load test.collection where foo2 = 789" />
						</div>
					</p>
				</>;
			}
		}		
	});
	
})();
