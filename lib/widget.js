var _ = require("underscore")._,
    inherits = require("inherits"),
    FSM = require("./fsm"),
    Registry = require("./registry"),
    cache = require("./simple-cache"),
    simpleId = require("./simple-id"),
    ns = require("./ns"),
    node_path = require("path");

var localId = simpleId();

/**
 * @class Widget provides a nicely encapsulated composition model for RIAs.
 * Each widget handles its own server side templating (ideally hooked into a streaming
 * context and cached for performance), as well as client-side componentization and
 * client/server communications. The idea is to author generically re-usable components
 * that can be composed into larger ones until one of them is your "application" (which
 * of course can later be consumed inside another context, etc.).
 *
 * @extends EventPublisher
 * @param {Object} options The configuration options for the instance
 */
var Widget = module.exports = function(options) {
  Widget.super.apply(this, arguments);
  
  this.dom          = options.dom;
  this.container    = options.container;
  this.containerId  = options.containerId;
  this.myid         = options.myid; //the shortened version of the auto prefixed long id (note: this can be a collision with other widgets so don't rely on it too much; its main use is to auto-attach an instance property for children)
  this.request      = options.request;
  this.client       = options.client;
  this.scripts      = [];
  
  //children/parent relationships
  if (options.parent) {
    options.parent.children = options.parent.children || new Registry();
    options.parent.children.add(this);
    options.parent[this.myid] = this;
    this.parent = options.parent;
  }
};

/**
 * 
 */
Widget.prototype.states = {
  initial: {
    render: function() {
      return this.states.rendering;
    }
  },
  rendering: {
    stateStartup: function(args, cb) {
      var me = this;

      //invoke onRender function if implemented
      if (typeof me.onRender === "function") me.onRender(args);

      if (me.container && args) {
        if (!me.template) {
          // TODO: Support loading templates from alternate location?  If we get in here, there is no template file.
        }
        var $j = args.dom.$j;
        
        //if we're still in this state, finish rendering
        var _t = $j.template(null, me.template);
        me.container.html(_t($j, {data: me}).join(""));
        
        //loop the custom tags and execute their handlers
        tagHandlers.each(function(tagHandler) {
          $j(tagHandler.id, me.container).each(function(index, tag) {
            //throw if any defined disallowed tags for this handler are found to be embedded
            if (tagHandler.disallowedTags) {
              _.each(tagHandler.disallowedTags, function(disallowed) {
                if ($j(disallowed, tag).length > 0) throw new Error("Cannot embed '" + disallowed + "' tags within '" + tagHandler.id +"' tags.");
              });
            }
            tagHandler.renderer({
              tag: tag,
              widget: me,
              renderOptions: args,
              dom: args.dom
            });
          });
        });
        
        if (me.contentTemplate) {
          var tmpl = $j.tmpl(me.contentTemplate.html(), me);
          if (tmpl && tmpl.appendTo) {
            var containers = $j("content", me.container);
            if (containers.length == 0) {
              me.container.append("<content/>");
              containers = $j("content", me.container);
            }
            containers.each(function(index, content){
              var div = $j("<div class='widgetContent'></div>").insertBefore(content);
              $j(content).remove();
              tmpl.clone().appendTo(div);
            });
          }
        }
        
        //now render any children widgets that just got embedded
        Widget.render(_.extend(_.clone(args), {
          node: me.container,
          idPrefix: me.id + "_",
          parentWidget: me,
          scripts: me.scripts
        }), function(err, _result) {
          //output the collected scripts into the container that came 1 level up from this render        
          args.scripts.push([
            '(function() {\\n',
              me.scripts.join("\n") + "\\n",
              'widget.fire("ready");\\n',
            '})();\\n'
          ].join(''));

          me.fire("ready", args, cb);
        });  
      }
    },
    ready: function(args, cb) {
      return this.states.ready;
    }
  },
  ready: {
    stateStartup: function(args, cb) {
      //invoke onReady function if implemented
      if (typeof this.onReady === "function") this.onReady(args);
      cb();
    }
  }
};

/**
 * widget-scoped jQuery selector method
 * @param {String} selector
 */
Widget.prototype.get = function(selector) {
  var $j = this.dom.$j;
  //fix id based selectors (if you are trying to do an absolute ID selector not scoped to this widget, just use $() instead of this.get())
  if (selector.indexOf("#") == 0) {
    selector = "#" + this.id + "_" + selector.substr(1);
  }
  var el = $j(selector, this.container || null);
  return el;
};

/**
 * method that can be used within templates to inject a jQuery tmpl expression into another nested widget's template,
 * to be evaluated in the context of that widget.
 * 
 * @param {String} tmplString
 */
Widget.prototype.$$ = function(tmplString) {
  return "${" + tmplString + "}";
};

/**
 * Initiates rendering of the widget
 * @param {Object} options
 */
Widget.prototype.render = function(options, cb) {  
  this.fire("render", options, cb); // behavior implemented via FSM controller        
};

/**
 * Disposes of the widget
 * @param {Object} $super
 */
Widget.prototype.dispose = function() {
  //kill the children
  if (this.children && this.children.each) {
    this.children.each(function(child) {
      try {
        child && child.dispose && child.dispose();
      } catch (ex) {
      }
    });
  }
  //remove UI elements
  if (this.container) {
    if (this.keepContainerOnDispose) {
      this.container.html("");
    } else {
      this.container.remove();
    }
  }
  Widget.super.prototype.dispose.apply(this, arguments);
};

inherits(Widget, FSM);


// Rendering Logic ------------------------------------------------------------------------------------------------------------------------------




/*
 * custom tags are not allowed to be in this list
 */
var tagBlacklist = ["widget", "options", "contenttemplate"];

/*
 * registry for custom tag handlers (cannot add a handler for a tag already being handled)
 * also cannot add a handler for tags otherwise handled and in the blacklist
 */
var tagHandlers = new Registry();

/**
 * Registers a new tag handler.
 * @param {Object} tagName The name of the custom tag being handled
 * @param {Object} tagRenderer The function that will handling rendering the custom tag into the document
 * @param {Object} disallowedTags An optional list of tags that cannot be embedded within this tag. 
 */
Widget.registerTagHandler = function(tagName, tagRenderer, disallowedTags) {
  if (tagBlacklist.indexOf(tagName.toLowerCase()) == -1) {
    //the add will already throw if a duplicate handler registration is attempted
    tagHandlers.add({
      id: tagName,
      renderer: tagRenderer,
      disallowedTags: disallowedTags
    });
  } else {
    throw new Error("Cannot add a tag handler for '" + tagName + "'");
  }
};

var tmplExpressions = [
  {
    expression: /\[\[([^\]]*)\]\]/g,
    replace: "{{$1}}"
  },
  {
    expression: /\$\[([^\]]*)\]/g, 
    replace: "${$1}"
  }
];

/*
 * register handlers for "template" and "insert_template" tags
 */
Widget.registerTagHandler("template", function(options) {
  var $j = options.dom.$j;
  
  //first, throw if the template is not at the top level
  if ($j(options.tag).parent()[0] !== options.widget.container[0]) {
    throw new Error("<template> tags may only be defined at the top level within a [widget].template.html file (i.e. they cannot be embedded within other tags).");
  }
  
  var tmpl = "<div>" + $j(options.tag).html() + "</div>";
  var client_enabled = options.tag.getAttribute("client_enabled");
  var name = options.tag.getAttribute("name");
  options.widget.templates = options.widget.templates || new Registry();
  var template = {
    id: name,
    tmpl: tmpl
  };
  options.widget.templates.add(template);
  $j(options.tag).remove();
  if (client_enabled == "true") {
    var clientTemplate = {
      id: name,
      tmpl: tmpl
    };
    _.each(tmplExpressions, function(expr) {
      clientTemplate.tmpl = clientTemplate.tmpl.replace(expr.expression, expr.replace);
    });
    var scriptBuilder = [
      'widget.templates.' + name + ' = ' + JSON.stringify(clientTemplate) + '.tmpl;'
    ];
    if (options.widget.templates.items.length == 1) {
      scriptBuilder.unshift('widget.templates = widget.templates || {};');
    }
    options.widget.scripts.push(scriptBuilder.join("\\n"));
  }
}, ["template", "widget", "dynamic"]); //disallowed tags

Widget.registerTagHandler("insert_template", function(options) {
  var $j = options.dom.$j;
  var name = options.tag.getAttribute("name");
  var data = options.tag.getAttribute("data");
  var template = options.widget.templates.findById(name);
  if (template) {
    var dataItems = [];
    if (data) {
      data = eval("("+data+")");// Interpret the data params they want
      for (var p in data) { // Create an array out of the properties in the data params
        dataItems.push(p); 
      }
      // Create a regex, and swap out any $[] vars that are in the data items with ${} so the tmpl 
      // call will eval them.  This leaves other $[] params alone for later eval dynamically.
      $j.tmpl(template.tmpl.replace(new RegExp("\\$\\[(" + dataItems.join("|") + ")?\\]", "g"), "${$1}"), data).insertBefore(options.tag);
    } else {
      // Else if there is no data attribute specified, do what was done before, just inserting the template as straight text.
      $j(template.tmpl).insertBefore(options.tag);
    }
  }
  $j(options.tag).remove();
}, ["template", "widget", "dynamic", "insert_template"]); //disallowed tags

/*
 * register the handler for the "dynamic" tag
 */
var asyncMethods = {};
cache.getItemWait("feather-dom", function(err, featherDom) {
  if (err) throw err;

  Widget.registerTagHandler("dynamic", function(options) {
    var $j = options.dom.$j;
    var tmpl = "<div>" + $j(options.tag).html() + "</div>";
    _.each(tmplExpressions, function(expr) {
      tmpl = tmpl.replace(expr.expression, expr.replace);
    });
    var _t = options.widget.dom.$j.template(null, tmpl);
    var methodName = options.tag.getAttribute("method");
    var params = options.tag.getAttribute("params");
    var placeHolderId = simpleId();
    var placeHolderStr = '<div id="' + placeHolderId + '"></div>';
    var placeholder = $j(placeHolderStr).insertBefore(options.tag);
    $j(options.tag).remove();
    if (methodName && !asyncMethods[methodName]) {
      var ownerName = methodName.replace(/(.*)[^\.]*\..*/, "$1");
      var owner = ns(ownerName, global, true);
      asyncMethods[methodName] = {
        owner: owner,
        fn: ns(methodName, global, true)
      };
    }
    options.renderOptions.result.renderers.push(function(renderOptions, cb) {
      var data = {request: renderOptions.request};
      if (methodName && typeof asyncMethods[methodName].fn === "function") {
        var _cb = function(err, result) {
          var newStr = err;
          if (!newStr) {
            data.result = result;
            newStr = _t(featherDom.$j, {data: data}).join("");
          } else {
            newStr = "<div class='templating_error'>" + newStr + "</div>";
          }
          renderOptions.html = renderOptions.html.replace(placeHolderStr, newStr)
          cb();
        };
        var _params;
        if (params) {
          _params = eval("[" + params + "]");
        } else {
          _params = [];
        }
        _params.push(renderOptions.request);
        _params.push(_cb);
        (asyncMethods[methodName].fn).apply(asyncMethods[methodName].owner, _params);
      } else {
        var newStr = _t(featherDom.$j, {data: data}).join("");
        renderOptions.html = renderOptions.html.replace(placeHolderStr, newStr)
        cb();
      }
    });
  }, ["template", "widget", "dynamic"]); //disallowed tags
});

var instanceScriptStr = [
  'var widget = new ${widgetName}({\\n',
    'id: "${id}",\\n',
    'myid: "${myid}",\\n',
    'parent: ${parentStr}\\n',
  '});\\n'
].join('');

Widget.prototype.getClientScript = function(options) {
  var me = this; //this == the widget instance
  var clientScript = "";
  var parentStr = me.parent ? "feather.Widget.widgets.findById('" + me.parent.id + "')" : "null";
  var replacements = {
    widgetName: me.widgetName,
    id: me.id,
    myid: me.myid,
    parentStr: parentStr
  };
  var _instanceScript;
  if (options.getInstanceScript) {
    _instanceScript = options.getInstanceScript(options);
  }
  var instanceScriptTemplate = this.dom.$j.template(null, instanceScriptStr);
  var tmpl = (_instanceScript || instanceScriptTemplate)(this.dom.$j, {
    data: replacements
  }).join("");
  clientScript += "\\n" + tmpl;
  return clientScript;
};

var glueTemplateStr = [
  '${widgetName}.prototype.server_${p} = function(params, callback) {\\n',
    'feather.socket.send({\\n',
      'type: "rpc",\\n',
      'data: {\\n',
        'widgetName: "${widgetName}",\\n',
        'widgetPath: "${widgetPath}",\\n',
        'widgetId: this.id,\\n',
        'methodName: "${p}",\\n',
        'params: (typeof params !== "function") ? params : []\\n',
      '},\\n',
      'callback: (typeof params === "function") ? params : callback\\n',
    '});\\n',
  '};\\n'
].join('');


function bindServerMethods(widget) {
  var serverMethods = [];
  for (var p in widget) {
    if (typeof widget[p] === "function" && widget[p].isServerMethod) {
      serverMethods.push(p);
    }
  }
  if (serverMethods.length > 0) {
    var glueTemplate = widget.dom.$j.template(null, glueTemplateStr);
    //override the getClientScript method in order to wire up a .server object on the client's representation
    var origClientScript = widget.getClientScript;
    widget.getClientScript = function(options) {
      var me = widget;
      var clientScript = origClientScript.call(widget, options);
      if (clientScript != "" && !widget.request.serverMethods[widget.widgetPath]) {
        _.each(serverMethods, function(p){
          var replacements = {
            widgetName: me.widgetName,
            widgetPath: me.widgetPath,
            p: p
          };
          var tmpl = glueTemplate(widget.dom.$j, {
            data: replacements
          }).join("");
          clientScript = tmpl + "\\n" + clientScript + "\\n";
        });
        widget.request.serverMethods[widget.widgetPath] = true;
      }
      return clientScript;
    };
  }
}

/**
 * tag the supplied function as a server method, so that code gets emitted to the client
 * to abstract the process of calling back to the server representation of the instance method
 * @param {Object} method
 */
Widget.serverMethod = function(method) {
  method.isServerMethod = true;
  return method;
};

var loadedClasses = new Registry();

var errors = {
  CLIENT_ONLY: {}
};

/**
 * Helper method for programmatically loading widget classes by path.
 * @param {Object} options
 * @static
 */
Widget.loadClass = function(path, widgetName, cb) {
  cache.getItemsWait([
    "feather-options",
    "feather-files"
  ], function(err, cacheItems) {
    if (err) cb(err); else {
      var appOptions  = cacheItems["feather-options"],
        files         = cacheItems["feather-files"],
        widgetClass   = loadedClasses.findById(path);

      if (!widgetClass) { //this class has not yet been defined, so load the class file now
        var filePath = appOptions.publicRoot + "/" + path + widgetName + ".server";
        if (!node_path.existsSync(filePath + ".js")) {
          filePath = appOptions.publicRoot + "/" + path + widgetName + ".client.js";
          if (node_path.existsSync(filePath)) {
            cb(errors.CLIENT_ONLY);
          } else {
            cb("no .server.js or .client.js file(s) found at path '" + path + "'");
          }
        } else {
          var getWidget = require(filePath).getWidget;
          if (typeof getWidget !== "function") {
            cb(new Error(filePath + ": expected a .getWidget method to be exported; none found."));
          } else {
            //TODO: migrate widget definitions to flight services api when implemented (preferably with some caching)
            getWidget(require("./feather"), function(err, widgetDef) {
              if (err) cb(err); else {
                Widget.create(widgetDef);
                var widgetClass = loadedClasses.findById(widgetDef.path);
                widgetClass.widgetName        = widgetName;
                widgetClass.fsWidgetPath      = appOptions.publicRoot + "/" + path + widgetName;
                widgetClass.clientFilePath    = appOptions.publicRoot + "/" + path + widgetName + ".client.js";
                widgetClass.clientHrefPath    = "/" + path + widgetName + ".client.js";
                widgetClass.templateFilePath  = appOptions.publicRoot + "/" + path + widgetName + ".template.html";
                widgetClass.template          = files.templateFiles[widgetClass.templateFilePath].data || " ";
                widgetClass.clientCssFilePath = appOptions.publicRoot + "/" + path + widgetName + ".css";
                widgetClass.clientCssHrefPath = "/" + path + widgetName + ".css";
                cb(null, widgetClass);
              }
            });  
          } 
        } 
      } else {
        cb(null, widgetClass);
      }      
    }
  });  
};

/**
 * Initiates a recursive rendering process inside the supplied DOM,
 * starting from the element specified.
 *
 * @param {Object} renderOptions
 * @param {Object} callback
 * @static
 */
Widget.render = function(renderOptions, callback) { 
  var dom = renderOptions.dom;
  var document = dom.document,
    $j = dom.$,
    body = $j('body')[0];
  
  renderOptions.result              = renderOptions.result || {};
  renderOptions.node                = renderOptions.node || document;
  renderOptions.idPrefix            = renderOptions.idPrefix || "";
  renderOptions.level               = renderOptions.level || 0;
  renderOptions.widgetClassRegistry = renderOptions.widgetClassRegistry || new Registry();
  renderOptions.widgets             = renderOptions.widgets || new Registry({
    uniqueErrorMessage: "All widgets must have unique id's for a given render context"
  }); 
  renderOptions.scripts = renderOptions.scripts || [];  
  
  var result            = renderOptions.result,
    node                = renderOptions.node, 
    idPrefix            = renderOptions.idPrefix, 
    parentWidget        = renderOptions.parentWidget, 
    level               = renderOptions.level, 
    widgetClassRegistry = renderOptions.widgetClassRegistry,
    widgets             = renderOptions.widgets,
    scripts             = renderOptions.scripts,
    req                 = renderOptions.request,
    context             = renderOptions.context;

  result.renderers = result.renderers || [];

  if (req && !req.serverMethods) {
    req.serverMethods = {};
  }
  
  /*
   * NOTE:
   * "widget" is the only _top_level_ non-html tag being handled (in this process)...
   * which means custom tags are handled only within the context of a containing widget tag.
   * In other words, if you want to add a custom tag handler, that tag can only be inside a widget.
   * The widget-level custom tags being explicitly handled are "options" and "contentTemplate".
   */
  
  /*
   * begin iterating the widget tags from the given node
   */
  if ($j('widget:first[clientonly!="true"]', node).length > 0) {
    $j('widget:first[clientonly!="true"]', node).each(function(index, widgetEl) {
      var myid = widgetEl.getAttribute("id");
      var id = idPrefix + myid;
      
      var path = widgetEl.getAttribute("path");
      var pathError = false;
      try {
        var widgetName = path.match(/[^\/]*\/$/)[0].replace("/", "");
      } catch (ex) {
        pathError = true;
        callback("Invalid widget path: " + path);
      }
      
      if (!pathError) {
        Widget.loadClass(path, widgetName, function(err, widgetClass) {
          if (err) {
            if (err === errors.CLIENT_ONLY) {
              widgetEl.setAttribute("clientonly", "true");
              //still send the widget info to the calling code
              if (!widgetClassRegistry.findById(path)) widgetClassRegistry.add({id: path});
              if ($j('widget:first[clientonly!="true"]', node).length > 0) { //need an exit condition to prevent infinite (pseudo)recursion
                Widget.render(renderOptions, callback);
              } else {  
                if (typeof callback === "function") {
                  result.scripts = scripts;
                  result.widgetClassRegistry = widgetClassRegistry;
                  result.widgets = widgets;
                  callback(null, result);
                }     
              }
            } else {
              callback(err);
            }
          } else {
            //dump the widget class into the registry to track unique widget classes used in this render context
            var widgetClassPath = (widgetClass.path || widgetClass.id);
            if (widgetClassRegistry && !widgetClassRegistry.findById(widgetClassPath)) {
              widgetClassRegistry.add(widgetClass);
              //get the widget's css file tracked on the client
              if (context !== "widget")  { //if only rendering a single widget, don't include this bit
                scripts.push("if (!feather.Widget.resources.findById('" + widgetClassPath + ".css')) {\n" +
                  "  feather.Widget.resources.add({id: '" + widgetClassPath + ".css'});\n" +
                  "}\n");
              }
            }
                            
            //instantiate from the top down but render from the bottom up (into parent containers)...

            //set the options
            var options = {
              dom: dom,
              id: id,
              myid: myid,
              parent: parentWidget,
              request: req,
              node: widgetEl //allow the instance to look for any special custom tags it might support or to do any other thing it might want to do to the original node to augment behavior
            };
            var el = $j(widgetEl);
            
            //find any declaratively defined options
            var clientEnabledOptions = [];
            el.children("options").each(function(index, optionTag) {
              $j("option", optionTag).each(function(index, _opt) {
                var name = _opt.getAttribute("name"),
                  value = _opt.getAttribute("value"),
                  clientEnabled = _opt.getAttribute("client_enabled");
                try {
                  if (clientEnabled) {
                    clientEnabledOptions.push(name);
                  }
                  options[name] = JSON.parse(value);
                } catch (ex) {
                  options[name] = value;
                }
                $j(_opt).remove();
              });
            });

            //create the instance and cache some file and class info
            var instance                = new (widgetClass.classDef)(options);
            instance.clientFilePath     = widgetClass.clientFilePath;
            instance.templateFilePath   = widgetClass.templateFilePath;
            instance.template           = widgetClass.template;
            instance.clientCssFilePath  = widgetClass.clientCssFilePath;
            instance.clientCssHrefPath  = widgetClass.clientCssHrefPath;

            if (req && !req.serverMethods[instance.widgetPath]) {
              bindServerMethods(instance);
            }
            
            //store the instance in the local-to-this-render-cycle registry
            widgets.add(instance);
                
            //now emit any client.js files and instance creation scripts needed
            //note: we want this script emitted before any children's script so that
            //instantiation on the client takes place in the right order
            if (instance.getClientScript) {
              var clientScript = instance.getClientScript(renderOptions);
              instance.scripts.push(clientScript);
            }

            //now auto-propagate the client_enabled options to the client
            _.each(clientEnabledOptions, function(_opt) {
              instance.scripts.push('widget.options.' + _opt + ' = ' + JSON.stringify(options[_opt]) + ';');
            });
                
            //recurse down the children tree first so rendering goes from the bottom up
            Widget.render(_.extend(_.clone(renderOptions), {
              node: widgetEl,
              idPrefix: id + "_",
              parentWidget: instance,
              level: level++,
              scripts: instance.scripts
            }), function(err) {
              if (err) callback(err); else {
                //get the declaratively defined html for the widget if there is any
                instance.contentTemplate = el.children("contentTemplate");

                //remove the widget node from the current parent and replace with an appropriate container
                //TODO: move this into an instance method that can be overridden for custom container wrapping  
                var cssClass = widgetEl.getAttribute("class");
                var defaultClass = instance.widgetName.replace(/\./g, '_');
                if (cssClass) {
                  cssClass = 'class="' + defaultClass + ' ' + cssClass.replace(/\./g, '_') + '"';
                } else {
                  cssClass = 'class="' + defaultClass + '"';
                }
                instance.container = $j('<div id="' + id + '_Container" ' + cssClass + '></div>').insertBefore(widgetEl);
                instance.scripts.push([
                  // 'if (!widget.container) {\n',
                  //   'widget.container = widget.get("#Container");\n',
                  //   'if (widget.container) widget.containerId = widget.container.attr("id");\n',
                  // '}',
                  'widget.fire("init");\n'
                ].join(''));
                el.remove(); //removes the actual "widget" tag now that a container div has been put in its place to hold any generated HTML                
                
                //let the instance handle its own rendering (usually via a FSM controller),
                //which could very likely lead into more (pseudo)recursions if more children are rendered dynamically
                instance.render(renderOptions, function(err) { 
                  if (err) callback(err); else {
                    //we've finished recursing down 1 branch... continue on down the siblings now
                    if ($j('widget:first[clientonly!="true"]', node).length > 0) { //need an exit condition to prevent infinite (pseudo)recursion
                      Widget.render(renderOptions, callback);
                    } else {  
                      if (typeof callback === "function") {
                        result.scripts = scripts;
                        result.widgetClassRegistry = widgetClassRegistry;
                        result.widgets = widgets;
                        callback(null, result);
                      }     
                    } 
                  }
                }); 
              }            
            }); 
          }
        });
      }
    });
  } else {  
    if (typeof callback === "function") {
      result.scripts = scripts;
      result.widgetClassRegistry = widgetClassRegistry;
      result.widgets = widgets;
      callback(null, result);
    }     
  } 
  
};

/**
 * Helper factory method for creating widget subclass definitions.
 * This will allow other code to be injected into the class loading pipeline as needed,
 * as well as handle common concerns for FSM and templating setup.
 * @static
 * @memberOf feather.Widget
 * @param {Object} options
 */
Widget.create = function(options) {
  if (!options || !options.path || !options.name) {
    throw new Error("Widget.create requires an options argument with 'path' and 'name' properties.");
  }
  var classObj = loadedClasses.findById(options.path);
  if (!classObj) {
    classObj = {
      id: options.path,
      name: options.name
    };
    options.prototype = options.prototype || {};
    options.prototype.widgetPath = options.path;
    options.prototype.widgetName = options.name;
    var classDef = options.prototype.ctor || function() {
      classDef.super.apply(this, arguments);
      if (typeof this.onInit === "function") this.onInit.apply(this, arguments);
    };
    //TODO: optimize onRequest somehow to avoid the round trip
    if (typeof options.prototype.onRequest === "function" && !options.prototype.onRequest.isServerMethod) {
      options.prototype.onRequest = Widget.serverMethod(options.prototype.onRequest);
    }
    options.prototype.ctor && (delete options.prototype.ctor);
    classDef.prototype = options.prototype;
    inherits(classDef, Widget);
    classObj.classDef = classDef;
    loadedClasses.add(classObj);
  }
  return classObj.classDef;
};

//note: client is null if coming from ajaxProxy
Widget.doRpc = function doRpc(request, client, data, cb) {
  var shortWidgetName = data.widgetPath.match(/[^\/]*\/$/)[0].replace("/", "");
  Widget.loadClass(data.widgetPath, shortWidgetName, function(err, widgetClass) {
    if (err) (cb && cb(err)); else {
      var instance = new (widgetClass.classDef)({
        request: request,
        client: client
      });
      data.params.push(function(err, ret) {
        if (instance && instance.dispose) {
          instance.dispose();
        }
        if (err) (cb && cb(err)); else (cb && cb(null, ret));        
      });
      instance[data.methodName].apply(instance, data.params);
    }
  }); 
};