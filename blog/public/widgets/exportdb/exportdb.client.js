feather.ns("blog");
(function() { 
  blog.exportdb = feather.Widget.create({
    name: "blog.exportdb",
    path: "widgets/exportdb",
    prototype: {
      onReady: function() {
        var me = this;
        this.domEvents.bind(this.get("#exportBtn"), "click", function() {
          var msg = me.get("#export-message");
          msg.empty().append('Exporting...<br/>');
          me.server_runExport(function(result) {
            var toAppend = "";
            if (result.success) {
              toAppend = result.result;
            } else {
              if (typeof(result.err) === "string") {
                toAppend = result.err
              } else {
                result.err.message;
              }
              if (result.source) {
                toAppend += '; source: ' + result.source;
              }
            }
            msg.append(toAppend + '<br />')
          });
        });
      }
    }   
  }); 
})();
