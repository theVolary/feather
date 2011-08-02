feather.ns("blog");
(function() { 
  blog.importdb = feather.Widget.create({
    name: "blog.importdb",
    path: "widgets/importdb/",
    prototype: {
      onReady: function() {
        var me = this;
        this.domEvents.bind(this.get("#importBtn"), "click", function() {
          var msg = me.get("#import-message");
          msg.empty().append('Importing...<br/>');
          me.server_runImport([me.get("#overwrite").attr('checked')],function(result) {
            var toAppend = result.success ? result.result : (typeof(result.err) === "string") ? result.err : result.err.message;
            msg.append(toAppend + '<br />');
          });
        });
      }
    }   
  }); 
})();
