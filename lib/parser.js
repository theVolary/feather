var sys = require("sys"),
    fs = require("fs"),
    jsdom  = require("jsdom"),
    encoder = require('./encoder.js').Encoder;

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

jsdom.env({
  html: "<html><head></head><body></body></html>",
  scripts: ["./jquery.js"],
  done: function(errors, window) {
    global.window = window;
    global.document = window.document;
    global.$ = global.$j = global.jQuery = window.jQuery;
    fsm.fire("jqueryReady");
  }
});

exports.parse = function(path, options) {
    var req = options.request,
        cb = options.callback;
  
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
            scripts.sort(function(a, b) {
              var orderA = a.getAttribute("order");
              var orderB = b.getAttribute("order");
              if (!orderA && orderB) {
                return -1;
              }
              if (!orderB && orderA) {
                return 1;
              }
              if (orderA == orderB) {
                return 0;
              } else {
                return orderA > orderB ? 1 : -1;
              }
            });
            
            //initialize client jojo options
            var clientOptions = { //add to this as necessary
              socketPort: jojo.appOptions.socketPort
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
            
            resPackager.package({
              debug: jojo.appOptions.debug
            });
            
            /*var addedTags = {};
            jojo.widget.loadedClasses.each(function(widgetClass) {
              if (!addedTags[widgetClass.id]) {
                
                // Script stuff
                var clientScriptPath = widgetClass.id + widgetClass.widgetName + ".client.js";
                $j("<clientscript type='text/javascript' src='" + clientScriptPath + "'></clientscript>").appendTo($j("head"));
                
                // CSS Stuff
                var template = '<link rel="stylesheet" type="text/css" href="${href}" />';
                
                addedTags[widgetClass.id] = true;
              }
            });*/
            
            
            //convert to html
            html = $j("html").html();
            html = html.replace(/(\<\/?)clientscript/g, '$1script').replace("{pageScript}", scriptStr).replace(/\\n/g, "\n");
            
            cb(html);
            
            // SMK 20110310: Added this event wrapper to create a hook for disposal.  
            // This opens the door for widgets to suppress disposal until they are ready.
            jojo.event.eventDispatcher.on('domDisposal', function() {
              //unload this request's widget instances from memory (which will also clean up the server's DOM)
              for (var i=0, l=jojo.widget.widgets.items.length, w; i < l; i++) {
                w = jojo.widget.widgets.items[i];
                w && w.dispose && w.dispose();
              }
              
              document.innerHTML = "";
              //jojo.request.loadedCss = null; // ensures gc
            });
            jojo.event.eventDispatcher.fire('domDisposal');
        });
    });
};
