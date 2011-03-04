jojo.ns("blog");
(function() {
	
	blog.lastfive = jojo.widget.create({
		name : "blog.lastfive",
		path : "widgets/lastfive/",
		prototype : {
			initialize : function($super, options) {
				$super(options);
				
			},
			onReady : function(args) {
				var me = this;
				var maxEntries = blog.entries.length;
				var ul = me.get('#lastFiveList');
				var curr;
				if (maxEntries > 5) { maxEntries = 5; }
				
				for (var i = 0; i < maxEntries; i++) {
					
					curr = blog.entries[i];
					ul.append('<li class="blogentry"><h3 id="' + me.id + '_blog_header_' + curr.id + '">' + curr.summary + ' <span style="font-style:italic;font-size:75%;">Posted on ' + curr.pubDate.toString("MM/dd/yyyy hh:mm tt") + '</span></h3><p id="blog_content_' + curr.id + '" class="collapsed">' + curr.content + '</p></li>');
					
				}
				
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
