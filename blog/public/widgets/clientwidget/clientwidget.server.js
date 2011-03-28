jojo.ns("blog");

blog.clientwidget = jojo.widget.create({
  name : "blog.clientwidget",
  path : "widgets/clientwidget/",
  prototype : {
    initialize : function($super, options) {
      $super(options);
    },
    onReady : function(args) {
      var me = this;
    }
  }
});