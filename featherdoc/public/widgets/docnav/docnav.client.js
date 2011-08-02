feather.ns("featherdoc");

(function() { 
  featherdoc.docnav = feather.Widget.create({
    name: "featherdoc.docnav",
    path: "widgets/docnav/",
    prototype: {
      onReady: function() {
        var me = this;
        me.domEvents.bind(me.get('.navitem'), 'click', function(e) {
          e.preventDefault();
          var el = $(this);
          var navOptions = {
            type:el.attr('type'),
            method:el.attr('method'),
            path:el.attr('href')
          };
          me.fire('nav', navOptions);
        });
      }
    }   
  }); 
})();
