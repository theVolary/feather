jojo.ns("blog");

var clients = [];

blog.chat = jojo.widget.create({
  name: "blog.chat",
  path: "widgets/chat/",
  prototype: {
    initialize: function($super, options) {
      $super(options);
    }
  } // end prototype
});
