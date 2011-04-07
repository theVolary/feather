jojo.ns("blog");
(function() {

  blog.emptytemplate = jojo.widget.create({
    name : "blog.emptytemplate",
    path : "widgets/emptytemplate/",
    prototype : {
      initialize : function($super, options) {
        $super(options);
      },
      onReady : function(args) {
        var me = this;
        var id = jojo.id();
        $("<div id='" + id + "Container'></div>").appendTo(me.container);
        
        jojo.widget.load({
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
