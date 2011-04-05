var sys = require("sys"),
  fs = require("fs");

/**
 * Registry to track loaded templates
 */
jojo.widget.templates = new jojo.lang.registry();

/**
 * tag the supplied function as a server method, so that code gets emitted to the client
 * to abstract the process of calling back to the server representation of the instance method
 * @param {Object} method
 */
jojo.widget.serverMethod = function(method) {
  method.isServerMethod = true;
  return method;
};

jojo.widget.getInstance = function(options) {
  var parts = options.widgetName.split(".");
  jojo.widget.loadClass(options.widgetPath, parts[parts.length - 1]);
  var classObj = jojo.widget.loadedClasses.findById(options.widgetPath);
  if (classObj) {
    return new (classObj.classDef)(options);
  }
  return null;
};

var glueTemplate = [
  '<clientscript type="text/javascript">',
      '${widgetName}.prototype.server_${p} = function(params, callback) {\\n',
        'jojo.socket.send({\\n',
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
      '};\\n',
  '</clientscript>'
].join('');

var widgetCssTemplate = [
  '<link rel="stylesheet" type="text/css" href="${href}" />'
].join('');

/**
 * listen to the class creation pipeline and emit client glue code as needed
 */
jojo.widget.widgets.on("beforeWidgetClassCreation", function(args) {
  var serverMethods = [];
  var prototype = args.options.prototype;
  for (var _p in prototype) {
    (function(p) {
      if (typeof prototype[p] === "function" && prototype[p].isServerMethod) {
        serverMethods.push(p);
      }
    })(_p);
  }
  if (serverMethods.length > 0) {
    //override the getClientScript method in order to wire up a .server object on the client's representation
    prototype.getClientScript = function($super, options) {
      var clientScript = "";
      if ($super) {
        clientScript = $super(options);
      }
      var key = jojo.request.page + prototype.widgetPath + "_glueEmitted";
      if (clientScript != "" && !jojo.widget.widgets[key]) {
        serverMethods.each(function(p){
          var replacements = {
            widgetName: prototype.widgetName,
            widgetPath: prototype.widgetPath,
            p: p
          };
          var tmpl = $j.tmpl(glueTemplate, replacements);
          clientScript = tmpl.html() + "\\n" + clientScript + "\\n";
        });
        jojo.widget.widgets[key] = true;
      }
      return clientScript;
    };
  }
});

/**
 * Server-only instance method for emitting client  code
 * This is an instance member to allow overriding easily (for instance, for a db-backed widget definition)
 * @param {Object} options
 */
var instanceScript = [
  '<clientscript type="text/javascript">',
    'var widget = new ${widgetName}({\\n',
      'id: "${id}",\\n',
      'myid: "${myid}",\\n',
      'parent: ${parentStr}\\n',
    '});\\n',
  '</clientscript>'
].join('');

jojo.widget.prototype.getClientScript = function(options) {
  var me = this; //this == the widget instance
  var clientScript = "";
  var clientScriptItem = jojo.widgetClientFiles[me.clientFilePath];
  if (!clientScriptItem) {
    throw new Error("No widget client file found for widget: " + me.widgetName);
  }
  //a client.js file exists and was loaded, so we need an instance creation script now
  var parentStr = me.parent ? "jojo.lang.objects['" + me.parent.id + "']" : "null";
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
  var tmpl = $j.tmpl(_instanceScript || instanceScript, replacements);
  clientScript += "\\n" + tmpl.html();
  return clientScript;
};

/**
 * Legacy method... keeping it for backwards compatibility for now
 * I may re-visit concept of 'init' state, but for now, am just using a flat scripts array
 * for all emitted scripts (to be executed once the widget is in the 'ready' state on the client)
 * @param {Object} script
 */
jojo.widget.prototype.renderOnInitScript = function(script) {
  this.scripts.push(script);
};

/**
 * Default widget FSM server states
 */
jojo.widget.defaultStates = {
  initial: {
    stateStartup: function(widget, args) {
      if (!widget.scripts) {
        widget.scripts = [];
      }
    },
    render: function(widget, args) {        
      //move to the rendering state (if present)
      return widget.states.rendering;
    },
    serverCallback: function(widget, args) {
      //move to the serverCallback state if present
      return widget.states.serverCallback;
    }
  },
  rendering: {
    stateStartup: function(widget, args) {
      if (widget && widget.container && args) {
        if (!widget.template) {
          // TODO: Support loading templates from alternate location?  If we get in here, there is no template file.
        }
        
        //if we're still in this state, finish rendering
        var html = $j.tmpl(widget.template, widget).appendTo(widget.container);
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
        jojo.widget.render({
          node: widget.container,
          idPrefix: widget.id + "_",
          parentWidget: widget,
          level: 0,
          registry: args.registry,
          scripts: widget.scripts
        });
        
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
 * Helper method for programmatically loading widget classes by path.
 * @param {Object} options
 */
jojo.widget.loadClass = function(path, widgetName) {
  var widgetClass = jojo.widget.loadedClasses.findById(path);
  if (!widgetClass) { //this class has not yet been defined, so load the class file now
    var filePath = jojo.appOptions.publicRoot + "/" + path + widgetName + ".server";
    require(filePath);
    var widgetClass = jojo.widget.loadedClasses.findById(path);
    widgetClass.widgetName = widgetName;
    widgetClass.fsWidgetPath = jojo.appOptions.publicRoot + "/" + path + widgetName;
    widgetClass.clientFilePath = jojo.appOptions.publicRoot + "/" + path + widgetName + ".client.js";
    widgetClass.clientHrefPath = "/" + path + widgetName + ".client.js";
    widgetClass.templateFilePath = jojo.appOptions.publicRoot + "/" + path + widgetName + ".template.html";
    widgetClass.template = jojo.templateFiles[widgetClass.templateFilePath].data || " ";
    widgetClass.clientCssFilePath = jojo.appOptions.publicRoot + "/" + path + widgetName + ".css";
    widgetClass.clientCssHrefPath = "/" + path + widgetName + ".css";
  }
  return widgetClass;
};

/**
 * Here we're recursively querying for the custom 'widget' tags starting at the document level and bootstrapping the
 * rendering process.
 * @param (Object} renderOptions:
 *    @param {HTMLElement} node - seed DOM element to start rendering from
 *    @param {String} idPrefix - seed idPrefix to auto append as the recursion level gets deeper
 *    @param {Object} parentWidget - the parent instance for the current recursion level
 *    @param {Number} level - the numeric value for the current recursion level
 *    @param {Object} registry - a registry to track unique widget classes used for this render cycle
 */
jojo.widget.render = function(renderOptions) {
  var node = renderOptions.node, 
    idPrefix = renderOptions.idPrefix, 
    parentWidget = renderOptions.parentWidget, 
    level = renderOptions.level, 
    registry = renderOptions.registry;
  renderOptions.scripts = renderOptions.scripts || [];
  var scripts = renderOptions.scripts;
  level = level || 0;
  $j("widget:first", node).each(function(index, widgetEl) {  
    var myid = widgetEl.getAttribute("id");
    var id = idPrefix + myid;
    
    var path = widgetEl.getAttribute("path");
    var widgetName = path.match(/[^\/]*\/$/)[0].replace("/", "");
    
    //the class has been defined (or should have been) so we can create the instance now and commence rendering
    var widgetClass = jojo.widget.loadClass(path, widgetName);
    if (!widgetClass) {
      throw new Error("widgetClass is undefined for path '" + path + "'");
    }
    
    //dump the widget class into the registry to track unique widget classes used
    if (registry && !registry.findById(widgetClass.id)) {
      registry.add(widgetClass);
    }
                    
    //instantiate from the top down but render from the bottom up (into parent containers of course)
    //set the options
    var options = {
      id: id,
      myid: myid,
      parent: parentWidget,
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
        
    //now emit any client.js files and instance creation scripts needed
    //note: we want this script emitted before any children's script so that
    //instantiation on the client takes place in the right order
    if (instance.getClientScript) {
      var clientScript = instance.getClientScript(renderOptions);
      instance.scripts.push(clientScript);
    }
        
    //recurse down the children tree first so rendering goes from the bottom up
    jojo.widget.render({
      node: widgetEl,
      idPrefix: id + "_",
      parentWidget: instance,
      level: level++,
      registry: registry,
      scripts: instance.scripts
    });
    
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
      "if (!widget.container) {\n",
        "widget.container = widget.get('#Container');\n",
        "if (widget.container) widget.containerId = widget.container.attr('id');\n",
      "}"
    ].join(''));
    el.remove(); //removes the actual "widget" tag now that a container div has been put in its place to hold any generated HTML                
    
    //let the instance handle its own rendering (usually via a FSM controller),
    //which could very likely lead into more recursions if more children are rendered dynamically
    instance.render(renderOptions); 
    
  });
  
  //we've finished recursing down 1 branch... continue on down the siblings now
  if ($j("widget:first", node).length > 0) { //need an exit condition to prevent infinite recursion
    jojo.widget.render(renderOptions);
  }
};
