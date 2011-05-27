var sys = require("sys"),
    inherits = require("inherits"),
    fsm = require("./fsm"),
    registry = require("./registry");

var glueTemplate = null;

/**
     * Default widget FSM server states
     * @memberOf feather.widget
     * @static
     */
var defaultStates = {
  initial: {
    stateStartup: function(widget, args) {
      if (!widget.scripts) {
        widget.scripts = [];
      }
    },
    render: function(widget, args) {        
      //move to the rendering state (if present)
      return widget.states.rendering;
    }
  },
  rendering: {
    stateStartup: function(widget, args) {
      if (widget && widget.container && args) {
        if (!widget.template) {
          // TODO: Support loading templates from alternate location?  If we get in here, there is no template file.
        }
        var $j = args.dom.$j;
        
        //if we're still in this state, finish rendering
        var _t = $j.template(null, widget.template);
        widget.container.html(_t($j, {data: widget}).join(""));
        
        //loop the custom tags and execute their handlers
        tagHandlers.each(function(tagHandler) {
          $j(tagHandler.id, widget.container).each(function(index, tag) {
            //throw if any defined disallowed tags for this handler are found to be embedded
            if (tagHandler.disallowedTags) {
              tagHandler.disallowedTags.each(function(disallowed) {
                if ($j(disallowed, tag).length > 0) throw new Error("Cannot embed '" + disallowed + "' tags within '" + tagHandler.id +"' tags.");
              });
            }
            tagHandler.renderer({
              tag: tag,
              widget: widget,
              renderOptions: args,
              dom: args.dom
            })
          });
        });
        
        if (widget.contentTemplate) {
          var tmpl = $j.tmpl(widget.contentTemplate.html(), widget);
          if (tmpl && tmpl.appendTo) {
            $j("content", widget.container).each(function(index, content){
              var div = $j("<div class='widgetContent'></div>").insertBefore(content);
              $j(content).remove();
              tmpl.clone().appendTo(div);
            });
          }
        }
        
        //now render any children widgets that just got embedded
        widget.render(Object.extend(Object.clone(args), {
          node: widget.container,
          idPrefix: widget.id + "_",
          parentWidget: widget,
          scripts: widget.scripts,
          publicRoot:widget.publicRoot
        }));
        
        //output the collected scripts into the container that came 1 level up from this render        
        args.scripts.push([
          '(function() {\\n',
            widget.scripts.join("\n") + "\\n",
            'widget.fire("ready");\\n',
          '})();\\n'
        ].join(''));
      }
      //go back to whence we came
      return widget.states.initial;
    }
  }
};
  
/**
 * @class This is the public interface to return for the feather.widget class definition.
 * @name feather.widget
 * @extends feather.fsm.finiteStateMachine
 */
/**
 * @constructs
 * @param {Object} $super The base class constructor (automatically wired)
 * @param {Object} options The configuration options for the instance
 */
var widget = module.exports = function(options) {
  options = options || {};
  options.states = options.states || defaultStates;
  widget.super.apply(this, arguments);
  
  //subclass options
  this.dom = options.dom;
  this.containerWrapper = options.containerWrapper;
  this.container = options.container;
  this.containerId = options.containerId;
  this.keepContainerOnDispose = options.keepContainerOnDispose;
  this.template = options.template;
  this.myid = options.myid; //the shortened version of the auto prefixed long id (note: this can be a collision with other widgets so don't rely on it too much; its main use is to auto-attach an instance property for children)
  this.windowOptions = options.windowOptions;
  this.request = options.request;
  if (this.request && !this.request.serverMethods) {
    this.request.serverMethods = {};
  }
  this.client = options.client;
  
  //children/parent relationships
  if (options.parent) {
    options.parent.children = options.parent.children || new registry();
    options.parent.children.add(this);
    options.parent[this.myid] = this;
    this.parent = options.parent;
  }

  // TODO: I don't like this here, but it needs feather's dom to create the template.  Where else can this go?
  if (! glueTemplate) {
    glueTemplate = options.dom.$j.template(null, [
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
    ].join(''));
  }
  
  //add this instance to the widget registry
  widget.widgets.add(this);
  
  if (this.request && !this.request.serverMethods[this.widgetPath]) this.bindServerMethods();
};

widget.prototype.bindServerMethods = function() {
  var serverMethods = [];
    for (var p in this) {
      if (typeof this[p] === "function" && this[p].isServerMethod) {
        serverMethods.push(p);
      }
    }
    if (serverMethods.length > 0) {
      //override the getClientScript method in order to wire up a .server object on the client's representation
      var origClientScript = this.getClientScript;
      this.getClientScript = function(options) {
        var me = this;
        var clientScript = origClientScript.call(this, options);
        if (clientScript != "" && !this.request.serverMethods[this.widgetPath]) {
          serverMethods.each(function(p){
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
          this.request.serverMethods[this.widgetPath] = true;
        }
        return clientScript;
      };
    }
};

/**
 * widget-scoped jQuery selector method
 * @param {String} selector
 */
widget.prototype.get = function(selector) {
  var $j = this.dom.$j;
    //fix id based selectors (if you are trying to do an absolute ID selector not scoped to this widget, just use $() instead of this.get())
    if (selector.indexOf("#") == 0) {
      selector = "#" + this.id + "_" + selector.substr(1);
    }
    var el = $j(selector, this.container || null);
    return el;
};

/**
 * method that can be used to output a jQuery.tmpl string within another template instance
 * @param {String} tmplString
 */
widget.prototype.$$ = function(tmplString) {
  return "${" + tmplString + "}";
};

/**
 * Initiates rendering of the widget
 * @param {Object} options
 */
widget.prototype.render = function(options) {
  //invoke onRender function if implemented
  if (typeof this.onRender === "function") this.onRender(options);
  this.fire("render", options); // behavior implemented via FSM controller        
};

/**
 * Disposes of the widget
 * @param {Object} $super
 */
widget.prototype.dispose = function() {
  widget.widgets.remove(this);
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
  this.fire("disposed");
  widget.super.prototype.dispose.apply(this, arguments);
};

/**
 * Legacy method... keeping it for backwards compatibility for now
 * I may re-visit concept of 'init' state, but for now, am just using a flat scripts array
 * for all emitted scripts (to be executed once the widget is in the 'ready' state on the client)
 * @augments feather.widget
 * @param {Object} script
 */
widget.prototype.renderOnInitScript = function(script) {
  this.scripts.push(script);
};

inherits(widget, fsm);

// =============================================================================

/**
 * Helper factory method for creating widget subclass definitions.
 * This will allow other code to be injected into the class loading pipeline as needed,
 * as well as handle common concerns for FSM and templating setup.
 * @static
 * @memberOf feather.widget
 * @param {Object} options
 */
widget.create = function(options) {
  var classObj = widget.loadedClasses.findById(options.path);
  if (!classObj) {
    classObj = {
      id: options.path,
      name: options.name
    };
    options.prototype.widgetPath = options.path;
    options.prototype.widgetName = options.name;
    //fire an event that will allow outside code to have a say in how the class gets constructed,
    //for example: to decorate the prototype object as needed            
    widget.widgets.fire("beforeWidgetClassCreation", {
      options: options
    });
    var classDef = function(options) {
      classDef.super.apply(this, arguments);
    };
    classDef.prototype = options.prototype;
    inherits(classDef, widget);

    classObj.classDef = classDef;
    widget.loadedClasses.add(classObj);
  }
  return classObj.classDef;
};

/**
 * tag the supplied function as a server method, so that code gets emitted to the client
 * to abstract the process of calling back to the server representation of the instance method
 * @param {Object} method
 */
widget.serverMethod = function(method) {
  method.isServerMethod = true;
  return method;
};

widget.getInstance = function(options) {
  var parts = options.widgetName.split(".");
  widget.loadClass(options, options.widgetPath, parts[parts.length - 1]);
  var classObj = widget.loadedClasses.findById(options.widgetPath);
  if (classObj) {
    return new (classObj.classDef)(options);
  }
  return null;
};

widget.getClientScript = function(options) {
  var me = this; //this == the widget instance
  var clientScript = "";
  var clientScriptItem = widget.widgetClientFiles[me.clientFilePath];
  if (!clientScriptItem) {
    throw new Error("No widget client file found for widget: " + me.widgetName);
  }
  //a client.js file exists and was loaded, so we need an instance creation script now
  var parentStr = me.parent ? "widget.widgets.findById('" + me.parent.id + "')" : "null";
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
  var tmpl = (_instanceScript || widget.instanceScriptTemplate)(widget.dom.$j, {
    data: replacements
  }).join("");
  clientScript += "\\n" + tmpl;
  return clientScript;
};

/**
 * Helper method for programmatically loading widget classes by path.
 * @param {Object} options
 * @static
 */
widget.loadClass = function(options, path, widgetName) {
  var widgetClass = widget.loadedClasses.findById(path);
  if (!widgetClass) { //this class has not yet been defined, so load the class file now
    var pubRoot = options.publicRoot;
    var filePath = pubRoot + "/" + path + widgetName + ".server";
    require(filePath);
    var widgetClass = widget.loadedClasses.findById(path);
    widgetClass.widgetName = widgetName;
    widgetClass.fsWidgetPath = pubRoot + "/" + path + widgetName;
    widgetClass.clientFilePath = pubRoot + "/" + path + widgetName + ".client.js";
    widgetClass.clientHrefPath = "/" + path + widgetName + ".client.js";
    widgetClass.templateFilePath = pubRoot + "/" + path + widgetName + ".template.html";
    widgetClass.template = widget.templateFiles[widgetClass.templateFilePath].data || " ";
    widgetClass.clientCssFilePath = pubRoot + "/" + path + widgetName + ".css";
    widgetClass.clientCssHrefPath = "/" + path + widgetName + ".css";
  }
  return widgetClass;
};

/**
 * Renders a widget
 * @param {Object} renderOptions
 * @param {Object} callback
 * @static
 */
widget.render = function(renderOptions, callback) {
  var dom = renderOptions.dom;
  var document = dom.document,
    $j = dom.$j,
    body = $j('body')[0];
  
  renderOptions.result = renderOptions.result || {};
  renderOptions.node = renderOptions.node || document;
  renderOptions.idPrefix = renderOptions.idPrefix || "";
  renderOptions.level = renderOptions.level || 0;
  renderOptions.widgetClassRegistry = renderOptions.widgetClassRegistry || new registry();
  renderOptions.widgets = renderOptions.widgets || new registry(); 
  renderOptions.scripts = renderOptions.scripts || [];  
  
  var result = renderOptions.result,
    node = renderOptions.node, 
    idPrefix = renderOptions.idPrefix, 
    parentWidget = renderOptions.parentWidget, 
    level = renderOptions.level, 
    widgetClassRegistry = renderOptions.widgetClassRegistry,
    widgets = renderOptions.widgets,
    scripts = renderOptions.scripts,
    req = renderOptions.request;
    
  result.renderers = result.renderers || [];
  
  /*
   * NOTE:
   * "widget" is the only _top_level_ non-html tag being handled (in this process)...
   * which means custom tags are handled only within the context of a widget.
   * In other words, if you want to add a custom tag handler, that tag can only be inside a widget.
   * The widget-level custom tags being explicitly handled are "options" and "contentTemplate".
   */
  
  /*
   * begin iterating the widget tags from the given node
   */
  $j("widget:first", node).each(function(index, widgetEl) {  
    var myid = widgetEl.getAttribute("id");
    var id = idPrefix + myid;
    
    var path = widgetEl.getAttribute("path");
    var widgetName = path.match(/[^\/]*\/$/)[0].replace("/", "");
    
    //the class has been defined (or should have been) so we can create the instance now and commence rendering
    var widgetClass = widget.loadClass(renderOptions, path, widgetName);
    if (!widgetClass) {
      throw new Error("widgetClass is undefined for path '" + path + "'");
    }
    
    //dump the widget class into the registry to track unique widget classes used
    if (widgetClassRegistry && !widgetClassRegistry.findById(widgetClass.id)) {
      widgetClassRegistry.add(widgetClass);
    }
                    
    //instantiate from the top down but render from the bottom up (into parent containers of course)
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
    el.children("options").each(function(index, optionTag) {
      $j("option", optionTag).each(function(index, _opt) {
        var name = _opt.getAttribute("name"),
          value = _opt.getAttribute("value");
        options[name] = value;
        $j(_opt).remove();
      });
    });

    //create the instance and cache some file and class info
    var instance = new (widgetClass.classDef)(options);
    instance.clientFilePath = widgetClass.clientFilePath;
    instance.templateFilePath = widgetClass.templateFilePath;
    instance.template = widgetClass.template;
    instance.clientCssFilePath = widgetClass.clientCssFilePath;
    instance.clientCssHrefPath = widgetClass.clientCssHrefPath;
    
    //store the instance in the local-to-this-render-cycle registry
    widgets.add(instance);
        
    //now emit any client.js files and instance creation scripts needed
    //note: we want this script emitted before any children's script so that
    //instantiation on the client takes place in the right order
    if (instance.getClientScript) {
      var clientScript = instance.getClientScript(renderOptions);
      instance.scripts.push(clientScript);
    }
        
    //recurse down the children tree first so rendering goes from the bottom up
    widget.render(_.extend(_.clone(renderOptions), {
      node: widgetEl,
      idPrefix: id + "_",
      parentWidget: instance,
      level: level++,
      scripts: instance.scripts
    }));
    
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
      'if (!widget.container) {\n',
        'widget.container = widget.get("#Container");\n',
        'if (widget.container) widget.containerId = widget.container.attr("id");\n',
      '}',
      'widget.fire("init");\n'
    ].join(''));
    el.remove(); //removes the actual "widget" tag now that a container div has been put in its place to hold any generated HTML                
    
    //let the instance handle its own rendering (usually via a FSM controller),
    //which could very likely lead into more recursions if more children are rendered dynamically
    instance.render(renderOptions); 
    
  });
  
  //we've finished recursing down 1 branch... continue on down the siblings now
  if ($j("widget:first", node).length > 0) { //need an exit condition to prevent infinite recursion
    widget.render(renderOptions);
  }
  
  if (typeof callback === "function") {
    result.scripts = scripts;
    result.widgetClassRegistry = widgetClassRegistry;
    result.widgets = widgets;
    callback(result);
  }
};

/**
 * A registry to cache already loaded classes to prevent duplicate loads.
 * This registry will enforce unique ids and will fire events when items are added (allow other code to listen and take action if needed)
 * @static
 * @memberOf feather.widget
 * @see feather.lang.registry
 */
widget.loadedClasses = new registry();

/**
 * A registry to cache all widget instances to allow other code to listen and take action as needed.
 * @static
 * @memberOf feather.widget
 * @see feather.lang.registry
 */
widget.widgets = new registry();

/**
 *  Initializes the widget namespace with runtime data.  Called from server.js once the dom is ready.
 */
widget.init = function(feather) {
  var options = feather.appOptions;
  widget.publicRoot = options.publicRoot;
  widget.templateFiles = feather.templateFiles;
  widget.widgetClientFiles = feather.widgetClientFiles;

  /*
   * Server-only instance method for emitting client  code
   * This is an instance member to allow overriding easily (for instance, for a db-backed widget definition)
   * @param {Object} options
   */
  widget.instanceScriptTemplate = feather.dom.$j.template(null, [
    'var widget = new ${widgetName}({\\n',
      'id: "${id}",\\n',
      'myid: "${myid}",\\n',
      'parent: ${parentStr}\\n',
    '});\\n'
  ].join(''));
}