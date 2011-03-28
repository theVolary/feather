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
        $("<div id='" + id + "'></div>").appendTo(me.container);
        
        jojo.widget.load({
          path: "widgets/clientwidget/",
          options: {
            container: id,
            on: {
              ready: function(){
                alert("on ready");
              }
            }
          }
        });
      }
    }
  });

})();
