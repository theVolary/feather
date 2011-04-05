var sys = require("sys"), 
  fs = require("fs"), 
  jsdom = require("jsdom"), 
  encoder = require('./encoder.js').Encoder,
  resourcePackager = require("./resource-packager");

var emptyDoc = "<html><head></head><body></body></html>";

//create a little fsm to track jquery/dom ready state
var fsm = new jojo.fsm.finiteStateMachine({
  states: {
    initial: {
      jqueryReady: function(fsm, args) {
        //require custom scripts for manipulating the server page
        //TODO: make this generically configurable to allow the app layer to inject others
        require("./jquery-tmpl/jquery.tmpl.min");
        return fsm.states.ready;
      }
    },
    ready: {
      stateStartup: function(fsm, args) {
        //anything relying on jQuery/custom scripts being available (server-side) can now take place
      }
    }
  }
});

/**
 * init the DOM + jQuery
 */
jsdom.env({
  html: emptyDoc,
  scripts: ["./jquery.js"],
  done: function(errors, window) {
    global.window = window;
    global.document = window.document;
    global.$ = global.$j = global.jQuery = window.jQuery;
    fsm.fire("jqueryReady");
  }
});

exports.parse = function(path, options) {
  var req = options.request, cb = options.callback;
  
  fsm.onceState("ready", function() {
    fs.readFile(path, "utf-8", function(err, data) {
      if (err) {
        throw err;
      }
      var html = data;
      
      document.innerHTML = html;
      global.body = $j('body')[0];
      
      //initialize client jojo options
      var clientOptions = { //add to this as necessary
        socketPort: jojo.appOptions.socketPort,
        sessionCookie: jojo.appOptions.session.config.key
      };
      
      //start at the document level and render away
      var registry = new jojo.lang.registry(); //used to track unique classes used in this render cycle
      var scripts = [];
      jojo.widget.render({
        node: document,
        idPrefix: "",
        parentWidget: null,
        level: 0,
        registry: registry,
        scripts: scripts
      });
      var scriptStr = [
        'jojo.stateMachine.once("loadingComplete", function() {\n', 
          ' jojo.appOptions = ' + JSON.stringify(clientOptions) + ";\n", 
        '});\n',
        'jojo.stateMachine.onceState("ready", function(){\n',
          scripts.join("\n") + '\n',
        '});\n'
      ].join('');
      
      //last thing on the page should be to tell the main stateMachine loading is complete
      scriptStr += "jojo.stateMachine.fire('loadingComplete');\n";
      scriptStr += "jojo.stateMachine.fire('ready');\n";
      scriptStr = encoder.htmlDecode(scriptStr);
      
      $j("<clientscript type='text/javascript'>{pageScript}</clientscript>").appendTo(body);
      
      /**
       * package the resources required from this render cycle ------------------------------
       */
      resourcePackager.packageFrameworkResources({
        debug: jojo.appOptions.debug
      });      
      resourcePackager.packageWidgetResources({
        debug: jojo.appOptions.debug,
        registry: registry
      });
      
      //convert to html
      html = $j("html").html();
      html = html
        .replace(/\<\/?resources[^\>]*\>/g, "")
        .replace(/(\<\/?)clientscript/g, "$1script")
        .replace("{pageScript}", scriptStr)
        .replace(/\\n/g, "\n");
      
      cb(html);
      
      // SMK 20110310: Added this event wrapper to create a hook for disposal.  
      // This opens the door for widgets to suppress disposal until they are ready.
      jojo.event.eventDispatcher.on('domDisposal', function() {
        //unload this request's widget instances from memory (which will also clean up the server's DOM)
        for (var i = 0, l = jojo.widget.widgets.items.length, w; i < l; i++) {
          w = jojo.widget.widgets.items[i];
          w && w.dispose && w.dispose();
        }
        
        document.innerHTML = "";
      });
      jojo.event.eventDispatcher.fire('domDisposal');
    });
  });
};

/**
 * the .parseWidget method is meant for use via a client-side loading context --------
 */

var widgetTemplate = [
  '<widget id="${id}" path="${path}">',
    '<options>',
      '{{html options}}',
    '</options>',
  '</widget>'
].join('');

var optionTemplate = '<x><option name="${name}" value="${value}" /></x>';

var instanceScript = [
  '<clientscript type="text/javascript">',
    'var widget = new ${widgetName}(options);\\n',
  '</clientscript>'
].join('');

exports.parseWidget = function(options, cb) {
  document.innerHTML = emptyDoc;
  global.body = $j('body')[0];
  
  var optionsStr = "";
  if (options.options) {
    for (var p in options.options) {
      optionsStr += $j.tmpl(optionTemplate, {
        name: p,
        value: options.options[p]
      }).html();
    }
  }
  $j.tmpl(widgetTemplate, {
    id: options.id || jojo.id(),
    path: options.path,
    options: optionsStr
  }).appendTo(body);
  
  //start at the document level and render away
  var registry = new jojo.lang.registry();
  var scripts = [];
  jojo.widget.render({
    node: document,
    idPrefix: "",
    parentWidget: null,
    level: 0,
    registry: registry,
    scripts: scripts,
    getInstanceScript: function(renderOptions) {
      if (renderOptions.node === document) {
        return instanceScript;
      }
      return null;
    }
  });
  var scriptStr = encoder
    .htmlDecode(scripts.join("\n"))
    .replace(/\\n/g, "");
  scriptStr = "(function(options) {" + scriptStr + "})";

  //convert to html
  var html = $j(body).html();
  html = html.replace(/\\n/g, "\n");
  
  //loop the registry to determine which client classes are required
  var widgetClasses = [];
  registry.each(function(widgetClass) {
    widgetClasses.push(widgetClass.id);
  });
    
  //unload this request's widget instances from memory (which will also clean up the server's DOM)
  for (var i = 0, l = jojo.widget.widgets.items.length, w; i < l; i++) {
    w = jojo.widget.widgets.items[i];
    w && w.dispose && w.dispose();
  }
  
  document.innerHTML = "";
  
  //done, can call back to the client now
  cb({
    html: html,
    script: scriptStr,
    widgetClasses: widgetClasses
  });
};
