(function() {

  /**
   * @class This is the public interface to return for the feather.Widget class definition.
   *   The base class is feather.FiniteStateMachine, therefore all widgets must
   *   be instantiated with at least an 'initial' state definition.
   * @extends FiniteStateMachine
   * @constructs
   * @param {Object} options The configuration options for the instance
   */
  var Widget = feather.Widget = function(options) {
    var me = this;
    options = options || {};
    options.states = options.states || feather.Widget.defaultStates;
    Widget.super.apply(this, arguments);
    
    //dom management objects
    this.domEvents = new feather.DomEventCache();
    
    //data model (used in auto two-way datalinking)
    this.model = options.model || {};
    this.datalinkOptions = options.datalinkOptions;
    
    //container options
    this.containerOptions = options.containerOptions;
    this.container = options.container;
    this.containerId = options.containerId;
    this.keepContainerOnDispose = options.keepContainerOnDispose;
    if (this.container) {
      this.containerId = this.container.attr("id");
    } else if (this.containerId) {
      this.onceState("ready", function() {
        me.container = $(me.containerId);
      });
    } else if (this.containerOptions) {
      var containerizer = feather.Widget.containerizers[this.containerOptions.containerizer || "default"];
      if (containerizer && typeof containerizer.containerize === "function") {
        containerizer.containerize(this);
      }
    }
    
    this.myid = options.myid; //the shortened version of the auto prefixed long id (note: this can be a collision with other widgets so don't rely on it too much; its main use is to auto-attach an instance property for children)
    
    //children/parent relationships
    if (options.parent) {
      options.parent.children = options.parent.children || new feather.Registry();
      options.parent.children.add(this);
      options.parent[this.myid] = this;
      this.parent = options.parent;
    }
    
    //add this instance to the widget registry
    feather.Widget.widgets.add(this);
  };

  Widget.prototype = {
    datalink: function(options) {
      var me = this;
      options = options || me.datalinkOptions;
      //for now, automatic datalinking is predicated on finding one or more forms with a 'datalink' attribute
      me.get("form").each(function(index, form) {
        var datalink = $(form).attr("datalink");
        if (datalink) {
          feather.ns("model." + datalink, me);
          //unlinking and then linking to allow this to be called multiple times to enable dynamic form building scenarios
          $(form).unlink(me.model[datalink]);
          $(form).link(me.model[datalink], options);
          for (var p in me.model[datalink]) {
            $("[name=" + p + "]", form).each(function(index, field) {
              $(field).val(me.model[datalink][p]);
            });
          }
        }
      });
    },    
    /**
     * widget-scoped jQuery selector method
     * @param {String} selector
     */
    get: function(selector) {
      //fix id based selectors (if you are trying to do an absolute ID selector not scoped to this widget, just use $() instead of this.$())
      if (selector.indexOf("#") == 0) {
        selector = "#" + this.id + "_" + selector.substr(1);
      }
      var el = $(selector, this.container || null);
      return el;
    },    
    /**
     * Initiates rendering of the widget
     * @param {Object} options
     */
    render: function(options) {
      this.fire("render", options); // behavior implemented via FSM controller        
    },    
    /**
     * Disposes of the widget
     * @param {Object} $super
     */
    dispose: function() {
      feather.Widget.widgets.remove(this);
      if (this.domEvents) {
        this.domEvents.dispose();
      }
      //kill the children
      if (this.children && this.children.length) {
        _.each(this.children, function(child) {
          try {
            child && child.dispose && child.dispose();
          } catch (ex) {
          }
        });
      }
      //remove UI elements
      if (this.container) {
        if (this.keepContainerOnDispose) {
          this.container.html("");
        } else {
          this.container.remove();
        }
      }
      this.fire("disposed");
      Widget.super.prototype.dispose.apply(this, arguments);
    }
  };
  inherits(Widget, feather.FiniteStateMachine);
  
  /**
   * simple registry for containerizers
   */
  Widget.containerizers = {};
  
  /**
   * Default widget FSM client states
   */
  Widget.defaultStates = {
    initial: {
      stateStartup: function() {
      
      },
      render: function() {
        //move to the rendering state (if present)
        return this.states.rendering;
      },
      ready: function() {
        return this.states.ready;
      }
    },
    ready: {//this state indicates rendering has completed, the widget's DOM is ready for manipulation (if the widget has a UI)
      stateStartup: function() {
        //auto datalink model objects to forms
        this.datalink();
        if (!this.isReady && this.onReady) { //only execute the inline onReady method once
          var args = _.toArray(arguments);
          this.fire.apply(this, ["beforeReady"].concat(args));
          this.fire.apply(this, ["inlineReady"].concat(args)); //implementing this way to allow potential suppression or other scenarios                    
        }
        this.isReady = true;
      },
      inlineReady: function() {
        this.onReady.apply(this, arguments);
      }
    },
    rendering: {
      rendered: function() {
        return this.states.ready;
      }
    }
  };
  
  /**
   * A registry to cache already loaded classes to prevent duplicate loads.
   * This registry will enforce unique ids and will fire events when items are added (allow other code to listen and take action if needed)
   * @static
   * @memberOf Widget
   * @see Registry
   */
  Widget.loadedClasses = new feather.Registry();
  
  /**
   * A registry to cache all widget instances to allow other code to listen and take action as needed.
   * @static
   * @memberOf Widget
   * @see Registry
   */
  Widget.widgets = new feather.Registry();
  
  /**
   * Helper factory method for creating widget subclass definitions.
   * This will allow other code to be injected into the class loading pipeline as needed,
   * as well as handle common concerns for FSM and templating setup.
   * @static
   * @memberOf feather.Widget
   * @param {Object} options
   */
  Widget.create = function(options) {
    if (!options || !options.path || !options.name) {
      throw new Error("Widget.create requires an options argument with 'path' and 'name' properties.");
    }
    var classObj = feather.Widget.loadedClasses.findById(options.path);
    if (!classObj) {
      classObj = {
        id: options.path,
        name: options.name,
        runat: options.runat || "server"
      };
      options.prototype = options.prototype || {};
      options.prototype.widgetPath = options.path;
      options.prototype.widgetName = options.name;
      var classDef = options.prototype.ctor || function() {
        classDef.super.apply(this, arguments);
        if (typeof this.onInit === "function") this.onInit.apply(this, arguments);
      };
      options.prototype.ctor && (delete options.prototype.ctor);
      classDef.prototype = options.prototype;
      inherits(classDef, Widget);
      classObj.classDef = classDef;
      feather.Widget.loadedClasses.add(classObj);
    }
    return classObj.classDef;
  };
  
  /**
   * Helper method for loading widgets from the server.
   * @static
   * @memberOf Widget
   * @param {Object} options
   */
  Widget.load = function(options) {
    options.id = options.id || feather.id();
    feather.ns("serverOptions", options);
    options.serverOptions.id = options.serverOptions.id || options.id;
    var widgetClass = feather.Widget.loadedClasses.findById(options.path);
    if (widgetClass && widgetClass.runat === "client") {
      
    } else {
      //use the sysChannel for this operation (requires socket connection to be ready)
      feather.socket.stateMachine.onceState("ready", function() {
        var messageId = feather.id();
        //setup the reply handler
        //TODO: change this to use the simpler socket.send callback syntax
        feather.socket.sysBus.once("loadwidget:" + messageId, function(args) {
          var cb = function() {
            //hook into the 'init' event to render the html
            feather.ns("clientOptions.on", options);
            options.clientOptions.on.init = function(sender) {
              if (args.result.html && sender.container) {
                sender.container.append(args.result.html);
              }
            };
            options.clientOptions.id = options.id;
            if (args.result.script) {
              var func = eval(args.result.script);
              func(options.clientOptions);
            }
          };
          var files = [];
          _.each(args.result.widgetClasses, function(widgetClass) {
            if (!feather.Widget.loadedClasses.findById(widgetClass)) {
              var widgetName = widgetClass.match(/[^\/]*\/$/)[0].replace("/", "");
              files.push("/" + widgetClass + widgetName + ".client.js");
            }
          });
          if (files.length == 0) {
            cb(); 
          } else {
            feather.util.loadScripts({
              files: files,
              callback: cb
            });
          }
        });
        //fire off the message
        feather.socket.sysBus.fire("loadwidget", {
          messageId: messageId,
          widgetId: options.id,
          path: options.path,
          options: options.serverOptions
        });      
      });
    }
  };
})();
