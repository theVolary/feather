(function() {
  
  feather.ns("feather.ui");
  
  feather.ui.Dialog = feather.Widget.create({
    name: "feather.ui.Dialog",
    path: "feather-client/ui/Dialog/",
    clientOnly: true,
    template: [
      '<div class="modal fade{{if options.dialogClass}} ${options.dialogClass}{{/if}}" id="modal">',
        '<div class="modal-header">',
          '<button class="close">X</button>',
          '<h3>${options.title}</h3>',
        '</div>',
        '<div class="modal-body">',
          '{{html options.content}}',
        '</div>',
        '<div class="modal-footer">',
          '{{if options.buttons}}',
            '{{each(btnIndex, button) options.buttons}}',
              '<a href="#" class="btn{{if btnIndex == 0}} btn-primary{{/if}}" id="${id}_${button.text}btn">${button.text}</a>',
            '{{/each}}',
          '{{/if}}',
        '</div>',
      '</div>'
    ].join(''),
    prototype: {
      ctor: function(options) {
        options = options || {};
        options.title = options.title || "";
        options.id = options.id || feather.id();
        options.width = options.width || 560;
        options.height = options.height || 400;
        options.content = options.content || '';

        if (!_.isUndefined(options.modal)) {
          options.backdrop = options.modal;
        }
        if (_.isUndefined(options.backdrop)) {
          options.backdrop = false;
        }

        feather.ns("containerOptions", options);
        options.containerOptions.containerizer = function(w) {
          w.container = $(document.body);
        };

        //map buttons to array (better suited to iterating in the template)
        if (options.buttons) {
          options.buttons = _.map(_.keys(options.buttons), function(key) {
            return {
              text: key,
              fn: options.buttons[key]
            };
          });
        }

        feather.ui.Dialog._super.call(this, options);
      },
      onReady: function() {
        var me = this;

        me.container = me.get("#modal");

        me.container
          .width(me.options.width)
          .height(me.options.height); 

        me.get('.modal-body').height(me.options.height - 144); 

        //init the bootstrap modal component
        me.container.modal(me.options);
        me.container.modal('show');

        //setup button behaviors
        if (me.options.buttons) {
          _.each(me.options.buttons, function(button) {
            var btn = me.get('#' + button.text + 'btn');
            me.domEvents.bind(btn, 'click', button.fn);
          });
        }

        me.domEvents.bind(me.get('button.close'), 'click', function() {
          me.container.modal('hide');
        });

        //setup dispose behavior
        if (me.options.disposeOnClose !== false) { //default behavior is to dispose when hidden
          me.container.on("hidden", function() {
            if (!me.disposing) {
              me.dispose();
            }
          });
        }
      },
      open: function() {
        this.container && this.container.modal("show");
      },
      close: function(disposeOnClose) {
        if (disposeOnClose) {
          this.options.disposeOnClose = disposeOnClose;
        }

        this.container && this.container.modal("hide");
      },
      dispose: function() {
        this.disposing = true;
        this.options.disposeOnClose = true;
        this.container && this.container.modal("hide");
        feather.ui.Dialog._super.prototype.dispose.apply(this, arguments);
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
          widget.container = dialog.get('.modal-body');
          widget.setParent(dialog);
        });         

        //invert the widget's dispose method to call the dialog's first (gracefully close the dialog w/ animations if present)
        var _dispose = _.bind(widget.dispose, widget);
        widget.dispose = function() {
          if (dialog.disposing) {
            _dispose();
          } else {
            dialog.close(true);
          }
        };

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
      modal: true,
      dialogClass: "noCloseButton",
      closeOnEscape: false,
      content: content,
      buttons: {
        OK: function() {
          dialog.close(true);
          cb && cb();
        }
      }
    });
    dialog.render();
    return dialog;
  };

  /**
   * ui helper for confirmation dialogs
   */
  feather.confirm = function(title, content, cb) {
    var dialog = new feather.ui.Dialog({
      title: title,
      width: 500,
      height: 250,
      modal: true,
      content: content,
      dialogClass: "noCloseButton",
      closeOnEscape: false,
      buttons: {
        OK: function() {
          dialog.close(true);
          cb && cb();
        },
        Cancel: function() {
          dialog.dispose();
        }
      }
    });
    dialog.render();
    return dialog;
  };

  /**
   * ui helper for alert dialogs
   */
  feather.msg = function(title, content) {
    var dialog = new feather.ui.Dialog({
      title: title,
      width: 500,
      height: 250,
      modal: true,
      content: content
    });
    dialog.render();
    return dialog;
  };

  feather.prompt = function(title, promptContent, ok, cancel) {
    var content = '<div style="text-align: center"><div>' + promptContent + '</div><div><input type="text" name="prompt" /></div></div>';
    var dialog = new feather.ui.Dialog({
      title: title,
      width: 500,
      height: 250,
      modal: true,
      dialogClass: "noCloseButton",
      closeOnEscape: true,
      buttons: {
        OK: function() {
          ok && ok($('input', dialog.container).val());
          dialog.dispose();
        },
        Cancel: function() {
          dialog.dispose();
          cancel && cancel();
        }
      },
      onceState: {
        ready: function() {
          dialog.container.html(content);
        }
      }
    });
    dialog.render();
    return dialog;
  };
  
})();
