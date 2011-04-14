var sys = require("sys"), 
  fs = require("fs"), 
  jsdom = require("jsdom"), 
  encoder = require('./encoder.js').Encoder,
  resourcePackager = require("./resource-packager"),
  DomPool = require("./dom").DomPool;

feather.parser = new feather.event.eventPublisher();

feather.domPool = new DomPool(feather.appOptions.domPoolSize);
      
//initialize client feather options
var clientOptions = JSON.stringify({ //add to this as necessary
  socketPort: feather.appOptions.socketPort,
  sessionCookie: feather.appOptions.session.config.key
});

feather.parser.parseFile = exports.parseFile = function(path, options) {
  var req = options.request, cb = options.callback;
  
  fs.readFile(path, "utf-8", function(err, data) {
    if (err) {
      throw err;
    }
    var html = data;
    
    feather.domPool.getResource(function(dom) {      
      dom.document.innerHTML = html;
      
      feather.widget.render({
        dom: dom,
        node: dom.document
      }, function(result) {
        //inject scripts and resources into the dom
        var body = dom.$j("body")[0];
        
        var scriptStr = [
          'feather.stateMachine.once("loadingComplete", function() {\n', 
            ' feather.appOptions = ' + clientOptions + ";\n", 
          '});\n',
          'feather.stateMachine.onceState("ready", function(){\n',
            result.scripts.join("\n") + '\n',
          '});\n'
        ].join('');
        
        //last thing on the page should be to tell the main stateMachine loading is complete
        scriptStr += "feather.stateMachine.fire('loadingComplete');\n";
        scriptStr += "feather.stateMachine.fire('ready');\n";
        scriptStr = encoder.htmlDecode(scriptStr);
        
        dom.$j("<clientscript type='text/javascript'>{pageScript}</clientscript>").appendTo(body);
        
        /**
         * package the resources required from this render cycle ------------------------------
         */
        resourcePackager.packageFrameworkResources({
          debug: feather.appOptions.debug,
          dom: dom
        });      
        resourcePackager.packageWidgetResources({
          debug: feather.appOptions.debug,
          widgetClassRegistry: result.widgetClassRegistry,
          dom: dom
        });
        
        //cache resulting html
        var _html = dom.document.innerHTML;
        _html = _html
          .replace(/\<\/?resources[^\>]*\>/g, "")   
          .replace(/(\<\/?)clientscript/g, "$1script")       
          .replace("{pageScript}", scriptStr)
          .replace(/\\n/g, "\n");
        
        //unload this request's widget instances from memory (which will also clean up the DOM)
        for (var i = 0, l = result.widgets.items.length, w; i < l; i++) {
          w = result.widgets.items[i];
          w && w.dispose && w.dispose();
        }
        
        //create a render function to return to the main callback
        var render = function(_cb){
          if (!result.renderers || !result.renderers.length) {
            _cb(_html);
          } else {
            //feather.domPool.getResource(function(_dom) {
              //_dom.document.innerHTML = _html;
              //var renderOptions = {
              //  dom: _dom
              //};
              var renderOptions = {
                html: _html
              };
              /*var sem = new feather.lang.semaphore(function() {
                //var __html = _dom.document.innerHTML;
                //feather.domPool.release(_dom);
                _cb(renderOptions.html);
              });
              sem.semaphore = result.renderers.length;*/
              var sem = result.renderers.length;
              result.renderers.forEach(function(renderer) {
                renderer(renderOptions, function() {
                  //sem.execute();
                  sem--;
                  if (sem == 0) _cb(renderOptions.html);
                });
              });
            //});
          }     
        };
        
        //release outer dom resource and send render function back
        feather.domPool.release(dom);
        cb(render);
      });  
    });
  });
};