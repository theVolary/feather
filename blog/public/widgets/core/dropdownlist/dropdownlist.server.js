jojo.ns("jojo.widgets");
(function() {
	
	jojo.widgets.dropdownlist = jojo.widget.create({
		name: "jojo.widgets.dropdownlist",
		path: "widgets/core/dropdownlist/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
				//TODO: should probably normalize to all lowercase for options since the declarative options
				//are getting coerced to lowercase by the E4X engine
				this.valueField = options.valueField || options.valuefield || "id";
				this.textField = options.textField || options.textfield || "name";
				this.sourceObject = options.sourceObject || options.sourceobject;
				this.objectId = options.objectId || options.objectid;
			},
			getTemplate: function(options) {
				var me = this;
				var mappings = {};
				mappings[this.valueField] = "valueField";
				mappings[this.textField] = "textField";
				var clientItems = [];
				var template = jojo.data.databind({
					template: <>
						<select id={this.id + "_DDL"}>
							<itemTemplate>
								<option value="#valueField#">#textField#</option>
							</itemTemplate>
						</select>
					</>,
					sourceObject: this.sourceObject,
					objectId: this.objectId,
					mappings: mappings,
					beforeItemDataBound: function(item, index, itemTemplate) {
						var clientItem = {};
						clientItem[me.valueField] = item[me.valueField];
						clientItem[me.textField] = item[me.textField];
						clientItems.push(clientItem);
						me.fire("beforeItemDataBound", {item: item, index: index, itemTemplate: itemTemplate});					
					}
				});
				this.renderOnInitScript("this.items = " + Object.toJSON(clientItems) + ";");
				return template;
			}
		}		
	});
	
})();
