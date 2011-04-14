feather.ns("blog");
(function() {
	
	blog.latestposts = feather.widget.create({
		name : "blog.latestposts",
		path : "widgets/latestposts/",
		prototype : {
			initialize : function($super, options) {
				$super(options);
				var me = this;
			},
      onReady: function() {
        // Bind a click event to the headers to expand / collapse them.
        this.domEvents.bind(this.get(".blogentry h3"), "click", function(event) {
          var target = $(this); //note: 'this' inside jQuery .bind functions === the element that triggered the event
          if (target[0]) {
            var content = target.next('p');
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
