(function() {
  
  /**
   * Feather's default ui toolkit is jQuery UI. This file is intended
   * to provide a lightweight API shim to program against (which will be similar to jQuery's), 
   * which will make it easier to use another ui toolkit if desired, assuming fairly
   * similar components.
   * 
   * Where this API differs from jQueryUI is that it's for use with the feather widget
   * rendering cycle, which is markedly different than the standard jQueryUI approach of first
   * defining the markup and $() wrapping a container before calling .dialog() on it (or the like).
   * In our case, the user-facing markup (of the feather widget) is usually sent from the server 
   * and the skeleton markup required by the underlying jQueryUI component will be auto-created. 
   * The end result will be a seamless integration point between feather widgets and jQueryUI, 
   * with the added bonus of a simple API that can be used to write an adapter to a different
   * ui toolkit if desired.
   * 
   * (Include jQuery UI and this file in your page to make use of this API)
   * 
   * When implementing a similar adapter for another toolkit, the idea is to include that toolkit
   * and a different file _like_ this one, that implements the same API, thus minimizing
   * changes to higher level application code.
   */
  
  feather.ns("feather.ui");
  
  /**
   * Wrap $.dialog with options and auto-generated markup
   * @param {Object} options
   */
  var dialogTmpl = "<div id='${id}' title='${title}'>${content}</div>";
  feather.ui.dialog = function(options) {
    options = options || {};
    options.title = options.title || "";
    options.id = options.id || feather.id();
    options.content = options.content || "";
    
    /**
     * TEMP workaround for the issue outlined here: http://bugs.jqueryui.com/ticket/7293
     * TODO: remove these two lines when jQueryUI 1.8.13 is released (target release for the bugfix)
     */
    options.resizable = false;
    window.console && window.console.debug("disabling resizable dialogs until jqueryUI 1.8.13 is released (see source comments)");
    
    var dialog = $.tmpl(dialogTmpl, options)
      .appendTo(document)
      .dialog(options);
    //make some conveniences
    dialog.open = function() {
      dialog.dialog("open");
    };
    dialog.close = function() {
      dialog.dialog("close");
    };
    dialog.destroy = function() {
      dialog.dialog("destroy");
    };
    return dialog;
  };
  
  /**
   * Create a simple dialog containerizer (and make it the default as well)
   */
  feather.widget.containerizers.dialog = feather.widget.containerizers["default"] = {
    containerize: function(widget) {
      var dialog = feather.ui.dialog(widget.containerOptions);
      widget.container = dialog;
      //wrap the dispose method to destroy the dialog, and the make closing the dialog dispose of the widget nicely as well
      var disposing = false;
      var oldDispose = widget.dispose;
      widget.dispose = function() {
        oldDispose.call(widget);
        if (!disposing) {
          disposing = true;
          dialog.destroy();
        }
      };
      if (widget.containerOptions.disposeOnClose !== false) {
        dialog.bind("dialogclose", function() {
          if (!disposing) {
            disposing = true;
            widget.dispose();
            dialog.destroy();
          }
        });
      }
    }
  };

  /**
   * empty containerizer
   */
  feather.widget.containerizers.empty = {containerize: feather.emptyFn};
  
})();
