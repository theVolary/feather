feather.ns("featherdoc");

(function() {	
  var currWidget = null;
  
	featherdoc.docengine = feather.widget.create({
		name: "featherdoc.docengine",
		path: "w/docengine/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			}, 
      onReady: function() {
        var me = this;
        me.docnav.on('nav', function(args) {
          me.loadDoc(args);
        });
      },
      loadDoc: function(options) {
        var me = this;
        var docContainer = me.get('#documentContainer');
        docContainer.addClass('shadow');
        var widgetName = "markdown";
        if (options.type === "api") {
          widgetName = null;
          docContainer.empty().append('<iframe src="'+options.url+'" name="apidoc" id="apidoc-iframe" class="apidoc-iframe" />');
          var iframe = jQuery('#apidoc-iframe');
          iframe.height(window.innerHeight - iframe.offset().top - 10); 
        }
        
        if (currWidget) {
          currWidget.dispose();
        }
        if (widgetName) {        
          feather.widget.load({
            path:"w/"+widgetName+"/",
            serverOptions: {
              url: options.url
            },
            clientOptions: {
              container: me.get('#documentContainer'),
              keepContainerOnDispose: true,
              on: {
                ready: function(args) {
                  currWidget = args.sender;
                }
              }
            }
          });
        } // end if.
      }
		}		
	});	
})();
