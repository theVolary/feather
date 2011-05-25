var sys = require("sys"),
    inherits = require("inherits"),
    fsm = require("./fsm"),
    registry = require("./registry");

var glueTemplate = null;
  
/**
 * @class This is the public interface to return for the feather.widget class definition.
 * @name feather.widget
 * @extends feather.fsm.finiteStateMachine
 */
/**
 * @constructs
 * @param {Object} $super The base class constructor (automatically wired)
 * @param {Object} options The configuration options for the instance
 */
var widget = module.exports = function(options) {
  options = options || {};
  options.states = options.states || feather.widget.defaultStates;
  widget.super.apply(this);
  
  //subclass options
  this.feather = options.feather;
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
  this.client = options.client;
  
  //children/parent relationships
  if (options.parent) {
    options.parent.children = options.parent.children || new registry();
    options.parent.children.add(this);
    options.parent[this.myid] = this;
    this.parent = options.parent;
  }

  if (! glueTemplate) {
    glueTemplate = options.feather.dom.$j.template(null, [
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
  }
  
  //add this instance to the widget registry
  options.feather.widget.widgets.add(this);
  
  if (this.request && !this.request.serverMethods[this.widgetPath]) this.bindServerMethods();
};

widget.prototype.bindServerMethods = function() {
  var serverMethods = [];
    for (var p in this) {
      if (typeof this[p] === "function" && this[p].isServerMethod) {
        serverMethods.push(p);
      }
    }
    if (serverMethods.length > 0) {
      //override the getClientScript method in order to wire up a .server object on the client's representation
      var origClientScript = this.getClientScript;
      this.getClientScript = function(options) {
        var me = this;
        var clientScript = origClientScript.call(this, options);
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
        return clientScript;
      };
    }
};

/**
 * widget-scoped jQuery selector method
 * @param {String} selector
 */
widget.prototype.get = function(selector) {
  var $j = this.dom.$j;
    //fix id based selectors (if you are trying to do an absolute ID selector not scoped to this widget, just use $() instead of this.get())
    if (selector.indexOf("#") == 0) {
      selector = "#" + this.id + "_" + selector.substr(1);
    }
    var el = $j(selector, this.container || null);
    return el;
};

/**
 * method that can be used to output a jQuery.tmpl string within another template instance
 * @param {String} tmplString
 */
widget.prototype.$$ = function(tmplString) {
  return "${" + tmplString + "}";
};

/**
 * Initiates rendering of the widget
 * @param {Object} options
 */
widget.prototype.render = function(options) {
  //invoke onRender function if implemented
  if (typeof this.onRender === "function") this.onRender(options);
  this.fire("render", options); // behavior implemented via FSM controller        
};

/**
 * Disposes of the widget
 * @param {Object} $super
 */
widget.prototype.dispose = function() {
  this.feather.widget.widgets.remove(this);
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
  widget.super.prototype.dispose.apply(this, arguments);
};

/**
 * Legacy method... keeping it for backwards compatibility for now
 * I may re-visit concept of 'init' state, but for now, am just using a flat scripts array
 * for all emitted scripts (to be executed once the widget is in the 'ready' state on the client)
 * @augments feather.widget
 * @param {Object} script
 */
widget.prototype.renderOnInitScript = function(script) {
  this.scripts.push(script);
};

inherits(widget, fsm);