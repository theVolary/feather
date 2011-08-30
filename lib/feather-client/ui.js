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
  feather.ui.Dialog = feather.Widget.create({
    name: "feather.ui.Dialog",
    path: "feather-client/ui/Dialog/",
    clientOnly: true,
    template: "<div id='container' title='${options.title}'></div>",
    prototype: {
      ctor: function(options) {
        options = options || {};
        options.title = options.title || "";
        options.id = options.id || feather.id();

        feather.ns("containerOptions", options);
        options.containerOptions.containerizer = function(w) {
          w.container = $(document.body);
        };
        feather.ui.Dialog.super.call(this, options);
      },
      onReady: function() {
        var me = this;
        this.container = me.get("#container");
        if (this.options.content) this.container.html(this.options.content);
        this.container.dialog(this.options);
        if (this.options.disposeOnClose !== false) {
          this.container.bind("dialogclose", function() {
            if (!me.disposing) {
              me.dispose();
            }
          });
        }
      },
      open: function() {
        this.container && this.container.dialog("open");
      },
      close: function() {
        this.container && this.container.dialog("close");
      },
      dispose: function() {
        this.disposing = true;
        this.container && this.container.dialog("destroy");
        feather.ui.Dialog.super.prototype.dispose.apply(this, arguments);
      }
    }
  });
  
  /**
   * Create a simple dialog containerizer (and make it the default as well)
   */
  feather.Widget.containerizers.dialog = feather.Widget.containerizers["default"] = {
    containerize: function(widget, containerOptions) {
      if (typeof widget === "string") {
        containerOptions && (containerOptions.content = widget);
        var dialog = new feather.ui.Dialog(containerOptions);
        dialog.render();
      } else {
        containerOptions = widget.containerOptions;
        var dialog = new feather.ui.Dialog(containerOptions);
        dialog.onceState("ready", function() {
          widget.container = dialog.container;
          widget.setParent(dialog);
        });              
        //wrap the dispose method to destroy the dialog
        widget.on("disposed", function() {
          if (!dialog.disposing) {
            dialog.dispose && dialog.dispose();
          }
        });
        dialog.render();
      }    
    }
  };

  /**
   * empty containerizer
   */
  feather.Widget.containerizers.empty = {containerize: feather.emptyFn};


  /**
   * ui helper for alert dialogs
   */
  feather.alert = function(title, content, cb) {
    var dialog = new feather.ui.Dialog({
      title: title,
      width: 500,
      height: 250,
      buttons: {
        OK: function() {
          dialog.dispose();
          cb && cb();
        }
      },
      onceState: {
        ready: function() {
          dialog.container.html(content);
        }
      }
    });
    dialog.render();
  };
  
})();
