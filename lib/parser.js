var sys = require("sys"),
    fs = require("fs"),
    jsdom  = require('./jsdom/lib/jsdom'),
    htmlParser = require('./node-htmlparser/node-htmlparser'),
    tmpl;

var dom = require('./jsdom/lib/jsdom/level1/core').dom.level1.core;
global.window = jsdom.jsdom(null, dom, {parser: htmlParser}).createWindow();
global.document = window.document;
//create a little fsm to track jquery/dom ready state
var fsm = new jojo.fsm.finiteStateMachine({
    states: {
        initial: {
            jqueryReady: function(fsm, args) {
                //require custom scripts for manipulating the server page
                //TODO: make this generically configurable to allow the app layer to inject others
                tmpl = require("./jquery-tmpl/jquery.tmpl.min");
                return fsm.states.ready;
            }
        },
        ready: {
            stateStartup: function(fsm, args) {
                sys.puts("jqReady");
            }
        }
    }
});

//on first load, create our global pointers to the singleton jQuery/dom
jsdom.jQueryify(window, "./jquery.js", function() {
    sys.puts("foobar");
    global.$j = window.jQuery;
    global.jQuery = $j;
    global.body = $j('body')[0];
    fsm.fire("jqueryReady");
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
            
            if (jojo.logger) {
                jojo.logger.log("*****************************************************************");
                jojo.logger.log("PRE HTML: " + html);
            }
            
            //start at the document level and render away
            jojo.widget.render(document, "");
                
            //move all script blocks (generated or otherwise) to a single block at the bottom of the document
            var scripts = $j("clientscript", body);
            var scriptStr = "";
            scripts && scripts.each(function(script) {
              if (script.type == "text/javascript") {
                  scriptStr += "\n" + script.innerHTML + "\n";
                  $j(script).remove();
              }
            });
            if (scriptStr !== "") {
              //TODO: convert to $j
              $j("<clientscript type='text/javascript'>" + scriptStr + "</clientscript>").appendTo(body);
            }
            
            //convert to html
            html = $j("html")[0].innerHTML;
            html = html.replace(/(\<\/?)clientscript/g, '$1script');
            if (jojo.logger) {
                jojo.logger.log("*****************************************************************");
                jojo.logger.log("POST HTML: " + html);
            }
            
            cb(html);
        });
    });
};
