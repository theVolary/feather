(function() {
	
	jojo.data.databind = function(options) {
		options = options || {};
		var objectId = options.objectId;
		var sourceObject = options.sourceObject;
		var mappings = options.mappings;
		if (objectId) {
			sourceObject = jojo.lang.objects[objectId];
		}
		if (!sourceObject) {
			throw new Error("All calls to jojo.data.databind must have a source object or valid objectId specified. If an objectId is specified, the object id must point to an existing object within the jojo.lang.objects cache.");
		}
		
		if (!sourceObject.each) {
			sourceObject = [sourceObject];
		}
		
		//build the template to return
		var template = options.template;
		var itemTemplates = template..itemTemplate;
		if (itemTemplates.length() > 0) {
			for (var i = 0; i < itemTemplates.length(); i++) {
				(function(itemTemplate, index) {							
					var templateStr = itemTemplate.children().toXMLString();
					var itemXML = <item></item>;
					sourceObject.each(function(_item, _index) {
						if (options.beforeItemDataBound) {
							options.beforeItemDataBound(_item, _index, itemTemplate);
						}
						var itemStr = templateStr;
						for (var p in mappings) {
							itemStr = itemStr.replace(new RegExp("\#" + mappings[p] + "\#", "g"), _item[p]);
						}
						itemXML.appendChild(new XML("<template>" + itemStr + "</template>"));
					});					
					//replace the 'live' xml node in the nodeList
					var templates = itemXML.template;
					var resultXML = <result></result>;
					for (var j = 0; j < templates.length(); j++) {
						resultXML.appendChild(<>{templates[j].*.toXMLString()}</>);
					}
					itemTemplates[index] = resultXML;			
				})(itemTemplates[i], i);
			}
		}
		return template;
	};
	
})();
