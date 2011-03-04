jojo.ns("jojo.widgets");
(function() {	
		
	jojo.widgets.thingEditor = jojo.widget.create({
		name: "jojo.widgets.thingEditor",
		path: "widgets/core/thingEditor/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
				this.instance = options.instance;

				if (!options.domContainerElement) {
					this.domContainerElement = Ext.get(Ext.DomHelper.append(document.body, {
						tag: "div"
					}));
				} else {
					this.domContainerElement = options.domContainerElement;
					this.domContainerElement.update("");
				}
			},
			onReady: function() {
				var me = this;	
				//TODO: do we need to do anything here?			
			},
			edit: function(options) {
				var me = this;
				me.domEvents.stopObservingAll();
				options = options || {};
				me.serverCall({
					methodName: "edit",
					params: [{data: me.instance.data}],
					callback: function(args) {
						if (args.success) {
							me.domContainerElement.update(args.result.html);
							me.domEvents.observe(me.$("saveBtn"), "click", function() {
								me.save();
							});
							me.domEvents.observe(me.$("cancelBtn"), "click", function() {
								me.domEvents.stopObservingAll();
								me.domContainerElement.update("");
							});
						}
					}
				});
			},
			save: function() {
				var me = this;
				for (var p in me.instance.data) {
					var editor = me.$(p + "editor");
					if (editor) {
						me.instance.data[p] = editor.getValue();
					}
				}
				me.instance.save(function(args) {
					debugger;
				});
			},
			dispose: function($super) {
				$super();
				this.domContainerElement.remove();
			}
		}		
	});
	
	//register thingEditor as the default editor for all instances 
	jojo.stateMachine.onceState("ready", function() {
		jojo.data.persevere.registerEditor({
			editor: jojo.widgets.thingEditor
		});
	});
	
})();
