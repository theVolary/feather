var sys = util = require("util"), 
  _ = require("underscore")._,
  fs = require("fs"), 
  jsdom = require("jsdom"), 
  encoder = new (require('./encoder.js').Encoder)(),
  EventPublisher = require("./event-publisher"),
  ResourceCache = require("./resource-cache"),
  ResourcePackager = require("./resource-packager"),
  DomPool = require("./dom").DomPool,
  cache = require("./simple-cache"),
  id = require("./simple-id"),
  Widget = require("./widget");

var clientOptions;

/**
 * Parses the given file and passes a render function to the callback.
 * @augments feather.parser
 * @param {String} path path to the file to parse
 * @param {Object} options Object containing 
 *   <ul class="desc"><li>request: HTTP Request</li>
 *   <li>callback: callback Function taking one parameter, a Function that will render the results of the parse operation</li></ul>  
 */
exports.parseFile = function(options, cb) {
  cache.getItems([
    "feather-options",
    "feather-logger",
    "feather-domPool"
  ], function(err, cacheItems) {
    if (err) cb(err); else {
      var appOptions = cacheItems["feather-options"],
        logger = cacheItems["feather-logger"],
        domPool = cacheItems["feather-domPool"],
        path = options.path,
        req = options.request;

      if (!clientOptions) {
        clientOptions = JSON.stringify({ //add to this as necessary
          socketPort: appOptions.socketPort,
          sessionCookie: appOptions.session.config.key
        });
      }

      logger.info({message:"Parsing file " + path, category:"feather.srvr"});
      
      fs.readFile(path, "utf-8", function(err, data) {
        if (err) cb(err); else {
          var html = data;
        
          domPool.getResource(function(dom) {      
            dom.document.innerHTML = html;

            Widget.render({
              dom: dom,
              node: dom.document,
              request: req,
              publicRoot: appOptions.publicRoot
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
              ResourcePackager.packageFrameworkResources({
                dom: dom,
                request: req,
                appOptions: appOptions
              });      
              ResourcePackager.packageWidgetResources({
                widgetClassRegistry: result.widgetClassRegistry,
                dom: dom,
                request: req,
                appOptions: appOptions
              });
              
              //cache resulting html
              var _html = dom.document.innerHTML;
              _html = _html
                .replace(/\<\/?resources[^\>]*\>/g, "")   
                .replace(/(\<\/?)clientscript/g, "$1script")       
                .replace("{pageScript}", scriptStr)
                .replace(/\\n/g, "\n");
                         
              //create a render function to return to the main callback
              var render = function(_req, _cb){
                if (!result.renderers || !result.renderers.length) {
                  _cb(_html);
                } else {
                  var renderOptions = {
                    html: _html,
                    request: _req
                  };
                  var sem = result.renderers.length;
                  _.each(result.renderers, function(renderer) {
                    renderer(renderOptions, function() {
                      sem--;
                      if (sem == 0) _cb(renderOptions.html);
                    });
                  });
                }     
              };

              //defer cleanup so we can get the content out the door
              process.nextTick(function() {
                //unload this request's widget instances from memory (which will also clean up the DOM)
                for (var i = 0, l = result.widgets.items.length, w; i < l; i++) {
                  w = result.widgets.items[i];
                  w && w.dispose && w.dispose();
                }
                //release outer dom resource and send render function back
                domPool.release(dom);
              });
              
              cb(null, render);
            });  
          });
        }
      });
    }
  });
  
};

/*
 * Template used below in .parseWidget
 * @type Array
 */
var widgetTemplate = [
  '<widget id="${id}" path="${path}">',
    '<options>',
      '{{html options}}',
    '</options>',
  '</widget>'
].join('');

/*
 * Template used below in .parseWidget
 */
var optionTemplate = feather.dom.$j.template(null, '<option name="${name}" value="${value}" />');

/*
 * Template used below in .parseWidget
 */
var instanceScript = feather.dom.$j.template(null, [
  'var widget = new ${widgetName}(options);\\n'
].join(''));

/**
 * Intended for use via feather-client's feather.widget.load method (ie. client-side widget loading)
 * @augments feather.parser
 * @param {Object} options
 * @param {Object} cb
 */
feather.parser.parseWidget = function(options, cb) {
  cache.getItems([
    "feather-options",
    "feather-logger",
    "feather-domPool"
  ], function(err, cacheItems) {
    if (err) cb(err); else {
      var appOptions = cacheItems["feather-options"],
        logger = cacheItems["feather-logger"],
        domPool = cacheItems["feather-domPool"],
        path = options.path,
        req = options.request;

      domPool.getResource(function(dom) {
        var document = dom.document,
          $j = dom.$j;
          
        var body = $j('body')[0];
        
        var optionsStr = "";
        if (options.options) {
          for (var p in options.options) {
            optionsStr += optionTemplate(dom.$j, {
              data: {
                name: p,
                value: options.options[p]
              }
            }).join("");
          }
        }
        
        //avoid server side id collisions (be safe)
        var widgetId = options.id || id();
        var safeWidgetId = id() + "___" + widgetId; //3 underscores just to make the replaces below more accurate
        var widgetIdRegex = new RegExp(safeWidgetId, "gm");
        $j.tmpl(widgetTemplate, {
          id: safeWidgetId,
          path: options.path,
          options: optionsStr
        }).appendTo(body);
        
        //start at the document level and render away
        Widget.render({
          dom: dom,
          node: document,
          request: options.request || {},
          publicRoot: appOptions.publicRoot,
          getInstanceScript: function(renderOptions) {
            if (renderOptions.node === document) {
              return instanceScript;
            }
            return null;
          }
        }, function(result) {
          var scriptStr = encoder
            .htmlDecode(result.scripts.join("\n"))
            .replace(widgetIdRegex, widgetId)
            .replace(/\\n/g, "");
          scriptStr = "(function(options) {" + scriptStr + "})";
        
          //convert to html
          var html = $j(body).html();
          html = html
            .replace(widgetIdRegex, widgetId)
            .replace(/\\n/g, "\n");
          
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

          //defer cleanup to next tick
          process.nextTick(function() {
            //unload this request's widget instances from memory (which will also clean up the server's DOM)
            for (var i = 0, l = result.widgets.items.length, w; i < l; i++) {
              w = result.widgets.items[i];
              w && w.dispose && w.dispose();
            }      
            
            domPool.release(dom);
          });
        });  
      });
    }
  });
};
