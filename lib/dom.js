var jsdom = require("jsdom"),
  ResourcePool = require("./resource-pool").ResourcePool;

var emptyDoc = "<html><head></head><body></body></html>";

exports.DomResource = Class.create(feather.fsm.finiteStateMachine, {
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

exports.DomPool = Class.create(ResourcePool, {
  getResource: function($super, cb) {
    $super(function(dom) {
      dom.onceState("ready", function() {
        cb(dom);
      });
    });
  },
  createResource: function() {
    return new exports.DomResource();
  },
  release: function($super, dom) {
    dom.reset();
    $super(dom);
  }
});
