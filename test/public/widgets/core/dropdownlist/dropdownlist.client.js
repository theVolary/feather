jojo.ns("jojo.widgets");
(function() {
	
	jojo.widgets.dropdownlist = jojo.widget.create({
		name: "jojo.widgets.dropdownlist",
		path: "widgets/core/dropdownlist/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function() {
				var me = this;
				if (me.items && me.items.length > 0) {
					me.selectedItem = me.items[0];
				}
				me.domEvents.observe(me.$("DDL"), "change", function() {
					me.selectedItem = me.items[me.$("DDL").dom.selectedIndex];
					me.fire("itemSelected");
				});
			}
		}		
	});
	
})();
