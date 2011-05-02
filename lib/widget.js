var sys = require("sys");
exports.init = function(appOptions) {
  feather.ns("feather.widget");
  var glueTemplate = feather.dom.$j.template(null, [

    '${widgetName}.prototype.server_${p} = function(params, callback) {\\n',
      'feather.socket.send({\\n',
        'type: "rpc",\\n',
        'data: {\\n',
          'widgetName: "${widgetName}",\\n',
          'widgetPath: "${widgetPath}",\\n',
          'widgetId: this.id,\\n',
          'methodName: "${p}",\\n',
          'params: (typeof params !== "function") ? params : []\\n',
        '},\\n',
        'callback: (typeof params === "function") ? params : callback\\n',
      '});\\n',
    '};\\n'
  ].join(''));
  
  /**
   * @class This is the public interface to return for the feather.widget class definition.  
   *   The base class is feather.fsm.FiniteStateMachine, therefore all widgets must be 
   *   instantiated with at least an 'initial' state definition.
   * @name feather.widget
   * @extends feather.fsm.finiteStateMachine
   */
  feather.widget = Class.create(feather.fsm.finiteStateMachine, /** @lends feather.widget.prototype */ {
    
    /**
     * @constructs
     * @param {Object} $super The base class constructor (automatically wired)
     * @param {Object} options The configuration options for the instance
     */
    initialize: function($super, options) {
      options = options || {};
      options.states = options.states || feather.widget.defaultStates;
      $super(options);
      
      //subclass options
      this.dom = options.dom;
      this.containerWrapper = options.containerWrapper;
      this.container = options.container;
      this.containerId = options.containerId;
      this.keepContainerOnDispose = options.keepContainerOnDispose;
      this.template = options.template;
      this.myid = options.myid; //the shortened version of the auto prefixed long id (note: this can be a collision with other widgets so don't rely on it too much; its main use is to auto-attach an instance property for children)
      this.windowOptions = options.windowOptions;
      this.request = options.request;
      if (this.request && !this.request.serverMethods) {
        this.request.serverMethods = {};
      }
      
      //children/parent relationships
      if (options.parent) {
        options.parent.children = options.parent.children || new feather.lang.registry();
        options.parent.children.add(this);
        options.parent[this.myid] = this;
        this.parent = options.parent;
      }
      
      //add this instance to the widget registry
      feather.widget.widgets.add(this);
      
      if (!this.request.serverMethods[this.widgetPath]) this.bindServerMethods();
    },
    bindServerMethods: function() {
      var serverMethods = [];
      for (var p in this) {
        if (this.myid === "createPost" && p === "createPost") {
          feather.logger.debug("p is " + p + " and has type " + typeof(this[p]) + " and isServerMethod is " + this[p].isServerMethod + " and hasOwnProperty is " + this.hasOwnProperty(p));
        }
        // hasOwnProperty comes up false here for server methods!
        if (/*this.hasOwnProperty(p) &&*/ typeof this[p] === "function" && this[p].isServerMethod) {
          serverMethods.push(p);
        }
      }
      if (serverMethods.length > 0) {
        //override the getClientScript method in order to wire up a .server object on the client's representation
        this.__proto__.origClientScript = this.__proto__.getClientScript;
        this.__proto__.getClientScript = function(options) {
          var me = this;
          var clientScript = this.origClientScript(options);
          // TODO: $super is not a function when calling this from widget.server.js line 437.
          /*if ($super) {
            clientScript = $super(options);
          }*/
          if (clientScript != "" && !this.request.serverMethods[this.widgetPath]) {
            serverMethods.each(function(p){
              var replacements = {
                widgetName: me.widgetName,
                widgetPath: me.widgetPath,
                p: p
              };
              var tmpl = glueTemplate(feather.dom.$j, {
                data: replacements
              }).join("");
              clientScript = tmpl + "\\n" + clientScript + "\\n";
            });
            this.request.serverMethods[this.widgetPath] = true;
          }
          feather.logger.info("client script is " + clientScript);
          return clientScript;
        };
      }
    },
    
    /**
     * widget-scoped jQuery selector method
     * @param {String} selector
     */
    get: function(selector) {
      var $j = this.dom.$j;
      //fix id based selectors (if you are trying to do an absolute ID selector not scoped to this widget, just use $() instead of this.get())
      if (selector.indexOf("#") == 0) {
        selector = "#" + this.id + "_" + selector.substr(1);
      }
      var el = $j(selector, this.container || null);
      return el;
    },
    
    /**
     * method that can be used to output a jQuery.tmpl string within another template instance
     * @param {String} tmplString
     */
    $$: function(tmplString) {
      return "${" + tmplString + "}";
    },
    
    /**
     * Initiates rendering of the widget
     * @param {Object} options
     */
    render: function(options) {
      //invoke onRender function if implemented
      if (typeof this.onRender === "function") this.onRender(options);
      this.fire("render", options); // behavior implemented via FSM controller        
    },
    
    /**
     * Disposes of the widget
     * @param {Object} $super
     */
    dispose: function($super) {
      feather.widget.widgets.remove(this);
      //kill the children
      if (this.children && this.children.each) {
        this.children.each(function(child) {
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
      $super();
    }
  });
  
  /**
   * A registry to cache already loaded classes to prevent duplicate loads.
   * This registry will enforce unique ids and will fire events when items are added (allow other code to listen and take action if needed)
   * @static
   * @memberOf feather.widget
   * @see feather.lang.registry
   */
  feather.widget.loadedClasses = new feather.lang.registry();
  
  /**
   * A registry to cache all widget instances to allow other code to listen and take action as needed.
   * @static
   * @memberOf feather.widget
   * @see feather.lang.registry
   */
  feather.widget.widgets = new feather.lang.registry();
  
  /**
   * Helper factory method for creating widget subclass definitions.
   * This will allow other code to be injected into the class loading pipeline as needed,
   * as well as handle common concerns for FSM and templating setup.
   * @static
   * @memberOf feather.widget
   * @param {Object} options
   */
  feather.widget.create = function(options) {
    var classObj = feather.widget.loadedClasses.findById(options.path);
    if (!classObj) {
      classObj = {
        id: options.path,
        name: options.name
      };
      options.prototype.widgetPath = options.path;
      options.prototype.widgetName = options.name;
      //fire an event that will allow outside code to have a say in how the class gets constructed,
      //for example: to decorate the prototype object as needed            
      feather.widget.widgets.fire("beforeWidgetClassCreation", {
        options: options
      });
      var classDef = Class.create(feather.widget, options.prototype);
      classObj.classDef = classDef;
      feather.widget.loadedClasses.add(classObj);
    }
    return classObj.classDef;
  };
};
