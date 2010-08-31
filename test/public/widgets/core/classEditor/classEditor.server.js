jojo.widget.loadClass("widgets/core/thingEditor/", "thingEditor");
jojo.ns("jojo.widgets");
(function() {
	jojo.widgets.classEditor = Class.create(jojo.widgets.thingEditor, {
		widgetName: "jojo.widgets.classEditor",
		widgetPath: "widgets/core/classEditor/",
		initialize: function($super, options) {
			$super(options);
		},/*
		edit: jojo.widget.serverMethod(function(options) {
			var result = {};
			var template = <div class="editor classEditor"><span class="title">Class Editor</span></div>;
			for (var p in options.data) {
				template.appendChild(<div class={"property property-" + p}>
					<div class="name"><span>{p}</span></div>
					<div class="value"><input type="text" value={options.data[p]} id={this.id + "_" + p + "editor"}/></div>
				</div>);
			}
			template.appendChild(<div class="buttons">
				<input type="button" id={this.id + "_saveBtn"} value="Save"/>
				<input type="button" id={this.id + "_cancelBtn"} value="Cancel" />				
			</div>);				
			result.html = template.toString();
			return result;
		}),*/
		getTemplate: function(options) {				
			return <>
			
			</>;
		}
	});
	
	var classObj = {
		id: "widgets/core/classEditor/",
		name: "jojo.widgets.classEditor",
		classDef: jojo.widgets.classEditor
	};
	jojo.widget.loadedClasses.add(classObj);
	
})();
