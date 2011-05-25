var jsdom = require("jsdom"),
    inherits = require("inherits"),
    fsm = require("./fsm"),
    ResourcePool = require("./resource-pool");

var emptyDoc = "<html><head></head><body></body></html>";

/**
 * @class represents a DOM resource
 * @name DomResource
 * @extends feather.fsm.finiteStateMachine
 */
var DomResource = exports.DomResource = function(options) {
  DomResource.super.apply(this, arguments);
  var me = this;  
  jsdom.env({
    html: emptyDoc,
    scripts: [
      "./jquery.js"
    ],
    done: function(errors, window) {
      require("./jquery.tmpl").init(window);
      me.window = window;
      me.document = window.document;
      me.$ = me.$j = me.jQuery = window.jQuery;
      me.fire("ready");
    }
  });
};

DomResource.prototype = {
  reset: function() {
    this.document.innerHTML = emptyDoc;
  },
  states: {
    initial: {
      ready: function(fsm, args) {
        return fsm.states.ready;
      }
    },
    ready: {}
  }
};

inherits(DomResource, fsm);

/**
 * @class represents a pool of DOM resources
 * @name DomPool
 * @extends ResourcePool
 */
var DomPool = exports.DomPool = function() {
  DomPool.super.apply(this, arguments);
};

/**
 * Returns a DOM object asynchronously via the provided callback function.
 * @param {Object} $super
 * @param {Object} cb callback function that receives a single parameter, the dom.
 */
DomPool.prototype.getResource = function(cb) {
  DomPool.super.prototype.getResource.call(this, function(dom) {
    dom.onceState("ready", function() {
      cb(dom);
    });
  });
};

  
/**
 * Creates a new DOM resource and returns it.
 * @returns {DomResource} a new dom resource
 */
DomPool.prototype.createResource = function() {
  return new DomResource();
};

/**
 * Releases a dom resource back to the pool.
 * @param {Object} $super
 * @param {Object} dom the dom to release
 */
DomPool.prototype.release = function(dom) {
  dom.reset();
  DomPool.super.prototype.release.apply(this, arguments);
};

inherits(DomPool, ResourcePool);