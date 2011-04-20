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
        this.bindUI();
      },
      bindUI: function() {
        var me = this;
        
        // Bind a click event to the headers to expand / collapse them.
        me.domEvents.bind(me.get(".blogentry h3"), "click", function(event) {
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
      },
      refreshPosts: function() {
        var me = this;
        me.server_getPosts(function(args) {
          if (args.success) {
            me.domEvents.unbindAll(); //avoid memory leaks
            me.get("#list").html("");
            var template = me.templates.findById("post");
            $.tmpl(template.tmpl, args.result).appendTo(me.get("#list"));
            me.bindUI();
          }
        });
      }
		}
	});

})();
