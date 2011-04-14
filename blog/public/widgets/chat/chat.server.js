feather.ns("blog");

var clients = [];

blog.chat = feather.widget.create({
  name: "blog.chat",
  path: "widgets/chat/",
  prototype: {
    initialize: function($super, options) {
      $super(options);
    }
  } // end prototype
});
