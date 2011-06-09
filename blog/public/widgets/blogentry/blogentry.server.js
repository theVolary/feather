var url = require("url");

exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "blog.blogentry",
    path: "widgets/blogentry/",
    prototype: {
      onInit: function(options) {
        var me = this;
        if (me.request.url) { 
          var params = url.parse(me.request.url, true).query;
          me.blogId = params.id;
        }
      },
      onRender: function() {
        this.scripts.push("widget.blogId = '" + this.blogId+ "';");
      },
      getPost: feather.Widget.serverMethod(function(blogId, _cb) {
        var me = this;
        feather.blog.api.getPost(blogId, _cb);
      })
    }   
  });
}
