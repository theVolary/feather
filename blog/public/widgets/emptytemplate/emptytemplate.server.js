jojo.ns("blog");
blog.emptytemplate = jojo.widget.create({
  name : "blog.emptytemplate",
  path : "widgets/emptytemplate/",
  prototype : {
    initialize : function($super, options) {
      $super(options);
    },
    onReady : function(args) {
      var me = this;
    }
  }
});