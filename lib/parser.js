var sys = require("sys"),
    fs = require("fs"),
    jsdom  = require('./jsdom/lib/jsdom'),
    htmlParser = require('./node-htmlparser/node-htmlparser'),
    jojo;

exports.init = function(jojo) {
  jojo = jojo;

  //on first load, ready a dom w/ Ext loaded for use within the parsing pipeline
  var window = jsdom.jsdom(null, {parser: htmlParser}).createWindow();
  var document = window.document;
  var head = document.getElementsByTagName("head")[0];
  var body = document.body;
  //jojo.stateMachine.suppress("loadingComplete", true); //buffer
  
  
  return exports;
};


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
    var window = jsdom.createWindow(html, null, {parser: htmlParser});
    var document = window.document;
    var head = document.getElementsByTagName("head")[0];
    var body = document.body;
    
    
    
    cb(html);
  });
};
