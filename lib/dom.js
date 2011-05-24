var jsdom = require("jsdom"),
    ResourcePool = require("./resource-pool").ResourcePool,
    feather = require("./feather").feather;

var emptyDoc = "<html><head></head><body></body></html>";

/**
 * @class represents a DOM resource
 * @name DomResource
 * @extends feather.fsm.finiteStateMachine
 */
exports.DomResource = Class.create(feather.fsm.finiteStateMachine, /** @lends DomResource.prototype */{
  /**
   * @constructs
   * @param {Object} $super
   * @param {Object} options
   */
  initialize: function($super, options) {
    var me = this;
    $super(options);
    
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
  },
  
  /**
   * Resets this dom resource to an empty document.
   */
  reset: function() {
    this.document.innerHTML = emptyDoc;
  },
  states: {
    initial: {
      ready: function(fsm, args) {
        return fsm.states.ready;
      }
    },
    ready: feather.fsm.emptyState
  }
});

/**
 * @class represents a pool of DOM resources
 * @name DomPool
 * @extends ResourcePool
 */
exports.DomPool = Class.create(ResourcePool, /** @lends DomPool.prototype */{
  /**
   * Returns a DOM object asynchronously via the provided callback function.
   * @param {Object} $super
   * @param {Object} cb callback function that receives a single parameter, the dom.
   */
  getResource: function($super, cb) {
    $super(function(dom) {
      dom.onceState("ready", function() {
        cb(dom);
      });
    });
  },
  /**
   * Creates a new DOM resource and returns it.
   * @returns {DomResource} a new dom resource
   */
  createResource: function() {
    return new exports.DomResource();
  },
  /**
   * Releases a dom resource back to the pool.
   * @param {Object} $super
   * @param {Object} dom the dom to release
   */
  release: function($super, dom) {
    dom.reset();
    $super(dom);
  }
});
