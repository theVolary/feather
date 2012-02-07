feather.ns("featherdoc");
(function() {
  featherdoc.navbar = feather.Widget.create({
    name: "featherdoc.navbar",
    path: "widgets/navbar/",

    prototype: {
      onReady: function() {
        var me = this;

        $('.nav > li').each(function (index) {
          // Set the onClick event of the links
          me.domEvents.bind(
              $(this).children(':first-child'), "click", function (event){
            // First, remove 'active' from all list items
            // Then set the clicked list item to active
            $('.nav > li').removeClass('active');
            $(this).parent().addClass('active');
          });
        });
      }
    }
  });
})();
