jojo.ns("jojo.widgets");
(function() {
	
	jojo.include("widgets/core/thingEditor/thingEditor.client.js");
	jojo.include("widgets/core/classEditor/classEditor.client.js");
	
	jojo.widgets.studio = jojo.widget.create({
		name: "jojo.widgets.studio",
		path: "widgets/core/studio/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
				var me = this;
				//initialize the classes from Persevere
				jojo.data.loadClasses("/", function(result) {
					//no need to do anything here actually (server side ajax is synchronous by default so this will always occur before the rendering phase)
				});
			},
			getTemplate: function(options) {				
				return <div>
					<input type="button" id={this.id + '_createBtn'} value="Create New"/>
					<widget path="widgets/core/dropdownlist/" id="classDDL">
						<options objectId={jojo.data.classes.id} valueField="id" textField="className"></options>
					</widget>
					<div id={this.id + '_editorDiv'}></div>
				</div>;
			}
		}		
	});
	
})();
