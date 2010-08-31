var sys = require("sys"),
    fs = require("fs"),
    jsdom  = require('./jsdom/lib/jsdom'),
    htmlParser = require('./node-htmlparser/node-htmlparser');

//on first load, ready a dom w/ Ext loaded for use within the parsing pipeline
var dom = require('./jsdom/lib/jsdom/level1/core').dom.level1.core;
var browser = require('./jsdom/lib/jsdom/browser/index').windowAugmentation(dom);
var window = jsdom.jsdom(null, {parser: htmlParser}).createWindow();
var document = window.document;
var self = browser.self;
var navigator = browser.navigator;
var location = browser.location;  
global.Ext = require("./extCore3.0/ext-all-node").init(browser, window, document, navigator, self, location);  

exports.parse = function(path, options) {
  var req = options.request,
    cb = options.callback;
    
  req.logger.log("parsing file: " + path);
  
  fs.readFile(path, "utf-8", function(err, data) {
    if (err) {
      throw err;
    }
    var html = data;
    
    //now the fun begins... need to parse the magical widgets and expand the templates
    /*var window = jsdom.createWindow(html, null, {parser: htmlParser});
    var document = window.document;
    var head = document.getElementsByTagName("head")[0];
    var body = document.body;*/
   
    document.innerHTML = html;
    
    //start at the document level and render away
    jojo.widget.render(document, "");
        
    //move all script blocks (generated or otherwise) to a single block at the bottom of the document
    var scripts = Ext.query("script", document.body);
    var scriptStr = "";
    scripts && scripts.each(function(script) {
      scriptStr += "\n" + script.innerHTML + "\n";
      Ext.get(script).remove();
    });
    if (scriptStr !== "") {
      Ext.DomHelper.append(document.body, {
        tag: "script",
        type: "text/javascript",
        html: scriptStr
      });
    }
    
    //convert to html
    html = document.getElementsByTagName("html")[0].innerHTML; 
    
    cb(html);
  });
};
