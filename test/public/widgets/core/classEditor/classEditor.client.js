jojo.ns("jojo.widgets");
(function() {
	
	jojo.widgets.classEditor = Class.create(jojo.widgets.thingEditor, {
		widgetName: "jojo.widgets.classEditor",
		widgetPath: "widgets/core/classEditor/",
		initialize: function($super, options) {
			$super(options);
		},
		edit: function($super, options) {
			//if we're creating a new Class, do some setup before invoking the editor
			if (this.instance.isNew) {
				this.instance.data = {
					"extends": "Object",
					"prototype": {}
				};
			}
			$super(options);
		}
	});
	
	//register classEditor as the default editor for Class instances (that is, new Class definitions)
	jojo.stateMachine.onceState("ready", function() {
		jojo.data.persevere.registerEditor({
			className: "Class",
			editor: jojo.widgets.classEditor
		});
	});
	
})();
