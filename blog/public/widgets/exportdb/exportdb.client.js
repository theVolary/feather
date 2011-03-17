jojo.ns("blog");
(function() {	
	blog.exportdb = jojo.widget.create({
		name: "blog.exportdb",
		path: "widgets/exportdb",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
				var me = this;
				this.domEvents.bind(this.get("#exportBtn"), "click", function() {
				  var msg = me.get("#export-message");
				  msg.empty().append('Exporting...<br/>');
          me.server_runExport(function(result) {
            var toAppend = result.success ? result.result : (typeof(result.err) === "string") ? result.err : result.err.message;
				    msg.append(toAppend + '<br />')
				  });
				});
			}
		}		
	});	
})();
