feather.ns("featherdoc");

(function() {	
	featherdoc.docnav = feather.widget.create({
		name: "featherdoc.docnav",
		path: "w/docnav/",
		prototype: {
      initialize: function($super, options) {
        $super(options);
      },
      onReady: function() {
        var me = this;
        me.domEvents.bind(me.get('.navitem'), 'click', function(e) {
          e.preventDefault();
          var el = $(this);
          debugger;
          me.fire('nav', {url: el.attr('href'), type:el.attr('type')});
        });
      }
		}		
	});	
})();
