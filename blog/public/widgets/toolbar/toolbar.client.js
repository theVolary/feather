feather.ns("blog");
(function() {	
  var template = '<span class="button ${name}" title="${tooltip}">&nbsp;</span>';
  
	blog.toolbar = feather.widget.create({
		name: "blog.toolbar",
		path: "widgets/toolbar/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
			  var me = this;
			  
			  me.addButton({ name:'refresh', tooltip: 'Refresh' });
			},
			addButton: function(options, callback) {
			  var me = this;
			  var button = $.tmpl(template, options);
			  if (!options.after) {
			    me.container.append(button);
			  } else {
			    if (typeof(options.after) === 'string') {
			      me.get('.'+options.after).after(button);
			    } else {
			      button.after(after);
			    }
		    }
		    
		    if (callback) {
		      me.on(options.name, callback);
	      }
	      
	      me.domEvents.bind(button, 'click', function(e) {
	        me.fire(options.name);
	      });
			  
			  return button;
			},
			removeButton: function(options) {
			  var me = this;
			  if (options.name) {
			    me.get('.'+options.name).remove();
			  }
			}
		}		
	});	
})();
