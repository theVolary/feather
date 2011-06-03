var sys = require("sys"),
    inherits = require("inherits"),
    EventPublisher = require("./event-publisher"),
    Registry = require("./registry");



/**
 * Widget provides a nicely encapsulated composition model for RIAs.
 * Each widget handles its own server side templating (ideally hooked into a streaming
 * context and cached for performance), as well as client-side componentization and
 * client/server communications. The idea is to author generically re-usable components
 * that can be composed into larger ones until one of them is your "application".
 *
 * @class
 * @name Widget
 * @extends EventPublisher
 * @constructs
 * @param {Object} options The configuration options for the instance
 */
var Widget = module.exports = function(options) {
  Widget.super.apply(this, arguments);
  
  this.dom = options.dom;
  this.container = options.container;
  this.containerId = options.containerId;
  this.myid = options.myid; //the shortened version of the auto prefixed long id (note: this can be a collision with other widgets so don't rely on it too much; its main use is to auto-attach an instance property for children)
  this.request = options.request;
  this.client = options.client;
  
  //children/parent relationships
  if (options.parent) {
    options.parent.children = options.parent.children || new Registry();
    options.parent.children.add(this);
    options.parent[this.myid] = this;
    this.parent = options.parent;
  }
};

/**
 * widget-scoped jQuery selector method
 * @param {String} selector
 */
Widget.prototype.get = function(selector) {
  var $j = this.dom.$j;
  //fix id based selectors (if you are trying to do an absolute ID selector not scoped to this widget, just use $() instead of this.get())
  if (selector.indexOf("#") == 0) {
    selector = "#" + this.id + "_" + selector.substr(1);
  }
  var el = $j(selector, this.container || null);
  return el;
};

/**
 * method that can be used within templates to inject a jQuery tmpl expression into another nested widget's template,
 * to be evaluated in the context of that widget.
 * 
 * @param {String} tmplString
 */
Widget.prototype.$$ = function(tmplString) {
  return "${" + tmplString + "}";
};

/**
 * Disposes of the widget
 * @param {Object} $super
 */
Widget.prototype.dispose = function() {
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
  Widget.super.prototype.dispose.apply(this, arguments);
};

inherits(Widget, EventPublisher);