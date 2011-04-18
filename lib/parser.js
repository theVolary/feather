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
            var renderOptions = {
              html: _html
            };
            var sem = result.renderers.length;
            result.renderers.forEach(function(renderer) {
              renderer(renderOptions, function() {
                sem--;
                if (sem == 0) _cb(renderOptions.html);
              });
            });
          }     
        };
        
        //release outer dom resource and send render function back
        feather.domPool.release(dom);
        cb(render);
      });  
    });
  });
};

/**
 * Template used below in .parseWidget
 */
var widgetTemplate = [
  '<widget id="${id}" path="${path}">',
    '<options>',
      '{{html options}}',
    '</options>',
  '</widget>'
].join('');

/**
 * Template used below in .parseWidget
 */
var optionTemplate = '<x><option name="${name}" value="${value}" /></x>';

/**
 * Template used below in .parseWidget
 */
var instanceScript = [
  '<clientscript type="text/javascript">',
    'var widget = new ${widgetName}(options);\\n',
  '</clientscript>'
].join('');

/**
 * Intended for use via feather-client's feather.widget.load method (ie. client-side widget loading)
 * @param {Object} options
 * @param {Object} cb
 */
feather.parser.parseWidget = function(options, cb) {
  feather.domPool.getResource(function(dom) {
    var document = dom.document,
      $j = dom.$j;
      
    var body = $j('body')[0];
    
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
      id: options.id || feather.id(),
      path: options.path,
      options: optionsStr
    }).appendTo(body);
    
    //start at the document level and render away
    var registry = new feather.lang.registry();
    var scripts = [];
    feather.widget.render({
      dom: dom,
      node: document,
      getInstanceScript: function(renderOptions) {
        if (renderOptions.node === document) {
          return instanceScript;
        }
        return null;
      }
    }, function(result) {
      var scriptStr = encoder
        .htmlDecode(result.scripts.join("\n"))
        .replace(/\\n/g, "");
      scriptStr = "(function(options) {" + scriptStr + "})";
    
      //convert to html
      var html = $j(body).html();
      html = html.replace(/\\n/g, "\n");
        
      //unload this request's widget instances from memory (which will also clean up the server's DOM)
      for (var i = 0, l = result.widgets.items.length, w; i < l; i++) {
        w = result.widgets.items[i];
        w && w.dispose && w.dispose();
      }      
      
      feather.domPool.release(dom);
      
      var classes = [];
      for (var id in result.widgetClassRegistry.itemCache) {
        classes.push(id);
      }
      if (!result.renderers || !result.renderers.length) {
        cb({
          html: html,
          script: scriptStr,
          widgetClasses: classes
        });
      } else {
        var renderOptions = {
          html: html
        };
        var sem = result.renderers.length;
        result.renderers.forEach(function(renderer) {
          renderer(renderOptions, function() {
            sem--;
            if (sem == 0) {
              cb({
                html: renderOptions.html,
                script: scriptStr,
                widgetClasses: classes
              });
            }
          });
        });
      }
    });  
  });
};
