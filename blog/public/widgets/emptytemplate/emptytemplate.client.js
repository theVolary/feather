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
        
        feather.widget.load({
          path: "widgets/clientwidget/",
          serverOptions: {
            foo: "bar"
          },
          clientOptions: {
            id: id,
            containerOptions: {
              title: "test",
              width: 500,
              height: 500,
              modal: true
            },
            on: {
              ready: function(args){ //args.sender here will be the new widget instance
                //alert("on ready: " + args.sender.id);
              }
            }
          }
        });
      }
    }
  });

})();
