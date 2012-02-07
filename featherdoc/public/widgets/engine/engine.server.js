var fs = require('fs'),
    path = require('path');

exports.getWidget = function(feather, cb) {
  cb(null, {
    name: "featherdoc.engine",
    path: "widgets/engine/",

    /*
     * Converting markdown files to HTML
     * A lot of the work is done synchronously because
     * this code only gets run at startup
     */
    prototype: {
      onInit: function(options) {
        var Converter = require('../../../lib/Markdown.Converter').Converter;
        var converter = new Converter();

        var docs_path = path.join(feather.appOptions.featherRoot, 
          '../featherdoc/docs');

        var docs_as_html = [];
        var file_list = fs.readdirSync(docs_path);
        file_list.forEach(function(file) {
          if (path.extname(file) === '.md') {
            var full_path = path.join(docs_path, file);
            var doc = {};
            var link = {};
            var file_no_ext;

            file_no_ext = path.basename(file, '.md'); // drop .md extension
            doc.key = file_no_ext.replace(/\s+/g, '-'); // make class friendly
            doc.value = converter.makeHtml(
              fs.readFileSync(full_path, 'utf-8')); // convert to HTML

            docs_as_html.push(doc);

            // Create links to append to the navbar widget
            link.url = "#";
            link.label = doc.key;
            link.text = file_no_ext.charAt(0).toUpperCase() +
                file_no_ext.slice(1);
            link.onclick = "$('html, body').animate({ scrollTop: $('." +
                link.label + "').offset().top - 60 }, 'slow' );";

            feather.appOptions.navbar.push(link);
          }
        });

        // Scope work around
        this.docs_as_html = docs_as_html;
      } // end onInit
    } // end prototype
  });
};
