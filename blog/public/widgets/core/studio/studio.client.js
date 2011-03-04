jojo.ns("jojo.widgets");
(function() {	
	
	jojo.widgets.studio = jojo.widget.create({
		name: "jojo.widgets.studio",
		path: "widgets/core/studio/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function() {
				var me = this,
					currentEditor;
				
				/**
				 * create new instance ---
				 * NOTE: for special classes (Class itself for example), specialized editors may be employed
				 */
				me.domEvents.observe(me.$("createBtn"), "click", function() {
					var selectedClass = me.classDDL.selectedItem;
					if (currentEditor) {
						currentEditor.dispose();
					}
					jojo.data.loadClasses(selectedClass.id, function() {
						var newItem = new entities[selectedClass.className].instance();
						currentEditor = newItem.edit({
							domContainerElement: me.$("editorDiv")
						});
					});
				});
			}
		}		
	});
	
})();
