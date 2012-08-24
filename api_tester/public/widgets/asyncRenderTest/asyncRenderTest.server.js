exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "api_tester.asyncRenderTest",
    path: "widgets/asyncRenderTest/",

    prototype: {

      onRender: function(render) {
        var me = this;

        process.nextTick(function() {
          me.foo = "content";

          render();
        });
      }
    }
  });
};