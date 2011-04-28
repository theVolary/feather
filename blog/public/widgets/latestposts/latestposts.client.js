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
        var me = this;
        feather.auth.api.on('authenticated', function() {
          me.checkUser();
        });
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
              target.val('-');
            } else {
              content.addClass('collapsed');
              target.val('+');
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
            var template = me.templates.findById("posts");
            $.tmpl(template.tmpl, args.result).appendTo(me.get("#list"));
            me.bindUI();
            me.checkUser();
          }
        });
      },
      checkUser: function() {
        var me = this;
        if (feather.auth.user && (feather.auth.user.hasAnyAuthority(['admin', 'editor']))) {
          $('.blogentry h3').prepend(function(index, html) {
            return '<input type="button" value="Edit" postid="' + $($('.blogentry h3')[index]).attr('postid') + '" class="btnEditPost" />';
          });
          me.domEvents.bind(me.get(".btnEditPost"), "click", function(event) {
            event.preventDefault();
            var postId = $(this).attr('postId');
            var post = {
              id: postId,
              summary: $('#'+postId+'-summary').text(),
              post: $('#'+postId+'-post').text()
            };
            me.fire("editPost", post);
          });
        }
      }
		}
	});

})();
