var sys = require("sys"), 
  fs = require("fs"), 
  jsdom = require("jsdom"), 
  encoder = require('./encoder.js').Encoder;

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

/**
 * helper function for ordering scripts
 */
function orderScripts(scripts) {
  scripts.sort(function(a, b) {
    var orderA = a.getAttribute("order");
    var orderB = b.getAttribute("order");
    if (!orderA && orderB) {
      return -1;
    }
    if (!orderB && orderA) {
      return 1;
    }
    if (orderA == orderB && orderA == "a") {
      var levelA = a.getAttribute("level");
      var levelB = b.getAttribute("level");
      if (levelA == levelB) return 0;
      return levelA > levelB ? 1 : -1;
    } else {
      return orderA > orderB ? 1 : -1;
    }
  });
}

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
      
      //start at the document level and render away
      jojo.widget.render(document, "");
      
      //move all script blocks (generated or otherwise) to a single block at the bottom of the document
      var scripts = $j("clientscript", body).toArray();
      orderScripts(scripts);
      
      //initialize client jojo options
      var clientOptions = { //add to this as necessary
        socketPort: jojo.appOptions.socketPort,
        sessionCookie: jojo.appOptions.session.config.key
      };
      var scriptStr = [
        'jojo.stateMachine.once("loadingComplete", function() {\n', 
        ' jojo.appOptions = ' + JSON.stringify(clientOptions) + ";\n", 
        '});\n'
      ].join('');
      
      //append emitted scripts
      scripts.forEach(function(script, index) {
        scriptStr += "\n" + script.innerHTML + "\n";
        $j(script).remove();
      });
      
      //last thing on the page should be to tell the main stateMachine loading is complete
      scriptStr += "jojo.stateMachine.fire('loadingComplete');\n";
      scriptStr += "jojo.stateMachine.fire('ready');\n";
      scriptStr = encoder.htmlDecode(scriptStr);
      
      $j("<clientscript type='text/javascript'>{pageScript}</clientscript>").appendTo(body);
      
      //add script tags for each live widget class
      var resPackager = require("./resource-packager");
      
      resPackager.packageWidgetResources({
        debug: jojo.appOptions.debug
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
  jojo.widget.render(document, "");
  
  //move all script blocks (generated or otherwise) to a single block at the bottom of the document
  var scripts = $j("clientscript", body).toArray();
  orderScripts(scripts);  
  
  //append emitted scripts
  var scriptStr = '';
  scripts.forEach(function(script, index) {
    scriptStr += "\n" + script.innerHTML + "\n";
    $j(script).remove();
  });
  scriptStr = encoder.htmlDecode(scriptStr);

  //convert to html
  var html = $j(body).html();
  html = html
    .replace(/(\<\/?)clientscript/g, "$1script")
    .replace("{pageScript}", scriptStr)
    .replace(/\\n/g, "\n");
  
  //loop the widget instances and include client js as needed
  var clientJS = {};
  jojo.widget.widgets.each(function(widget) {
    //do something...
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
    clientJS: clientJS
  });
};
