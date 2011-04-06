jojo.ns("blog");
(function() {
	
	blog.lastfive = jojo.widget.create({
		name : "blog.lastfive",
		path : "widgets/lastfive/",
		prototype : {
			initialize : function($super, options) {
				$super(options);
				var me = this;
			},
      onReady: function() {
        // Bind a click event to the headers to expand / collapse them.
        this.domEvents.bind(this.get("#lastFiveList .blogentry h3"), "click", function(event) {
          var target = event.target || event.srcElement;
          if (target) {
            var content = $(target).next('p');
            if (content.hasClass('collapsed')) {
              content.removeClass('collapsed');
            } else {
              content.addClass('collapsed');
            }
          }
        });
      }
		}
	});

})();
