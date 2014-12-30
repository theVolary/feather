var jsdom = require("jsdom"),
    inherits = require("inherits"),
    FSM = require("./fsm"),
    fs = require('fs'),
    path = require('path'),
    jQueryScript = fs.readFileSync(path.join(__dirname, 'jquery.js')),
    jQueryTmplScript = fs.readFileSync(path.join(__dirname, 'jquery-tmpl', 'jquery.tmpl.js'));

var emptyDoc = "<html><head></head><body></body></html>";

/**
 * @class DomResource represents a managed jsdom instance with jQuery and jQuery.tmpl
 * automatically loaded.
 *
 * Since DomResource inherits from FiniteStateMachine, you are able to reliably
 * use ".onceState("ready", function() {//work with dom here})" syntax in order
 * to be assured the DOM has been properly initialized with jQuery and jQuery.tmpl.
 *
 * Currently this wrapper may be a little thin/dumb, but I believe in the future we'll
 * be expanding what's managed here.
 *
 * Future support will be added for more generic usage (upfront loading of scripts, etc), but
 * for now our only need is jquery and tmpl.
 *
 * @extends FiniteStateMachine
 */
var DomResource = exports.DomResource = function(options) {
  DomResource.super.apply(this, arguments);
  var me = this;  
  jsdom.env({
    html: (options ? options.html || emptyDoc : emptyDoc),
    src: [
      jQueryScript,
      jQueryTmplScript
    ],
    done: function(error, window) {
      if (error) {
        console.log("DomResource.load: Error loading scripts. " + error);
      }
      me.window = window;
      me.document = window.document;
      me.$ = me.$j = me.jQuery = window.jQuery;
      me.fire("ready");
    }
  });
};

DomResource.prototype = {
  /**
   * The collection of states associated with this dom resource.
   */
  states: {
    initial: {
      ready: function(fsm, args) {
        return fsm.states.ready;
      }
    },
    ready: FSM.emptyState
  }
};

inherits(DomResource, FSM);

/**
 * @class manages use of DOM resources
 */
var DomManager = exports.DomManager = function() {
  var me = this;
  me.domResourceCount = 0;
};

/**
 * Returns a DOM object asynchronously via the provided callback function.
 * @param {Object} cb callback function that receives a single parameter, the dom.
 */
DomManager.prototype = {

  getResource: function(options, cb) {
    var me = this,
      dom = new DomResource(options);
    dom.onceState("ready", function() {
      me.domResourceCount++;
      cb(dom);
    });
  },

  /**
   * Releases a dom resource back to the pool.
   * @param {Object} dom the dom to release
   */
  release: function(dom) {
    var me = this;
    dom.window.close(); // jsdom needs the window closed to properly handle javascript memory cleanup
    dom.dispose();
    me.domResourceCount--;
  },

  resourceStats: function() {
    var me = this;
    return "Allocated Dom Resource Count is " + me.domResourceCount;
  }
};