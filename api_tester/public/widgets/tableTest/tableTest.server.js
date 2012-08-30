exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "api_tester.tableTest",
    path: "widgets/tableTest/",

    prototype: {

      onRender: function(render) {

        debugger;
        render();
      }
    }
  });
};