feather.ns("blog");
(function() {

  blog.emptytemplate = feather.widget.create({
    name : "blog.emptytemplate",
    path : "widgets/emptytemplate/",
    prototype : {
      initialize : function($super, options) {
        $super(options);
      },
      onReady : function(args) {
        var me = this;
        var id = feather.id();
        $("<div id='" + id + "Container'></div>").appendTo(me.container);
        
        feather.widget.load({
          path: "widgets/clientwidget/",
          serverOptions: {
            foo: "bar"
          },
          clientOptions: {
            id: id,
            container: $("#" + id + "Container"),
            on: {
              ready: function(args){
                alert("on ready: " + args.sender.id);
              }
            }
          }
        });
      }
    }
  });

})();
