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
          'this.serverCall({\\n',
            'widgetName: "${widgetName}",\\n',
            'widgetPath: "${widgetPath}",\\n',
            'id: this.id,\\n',
            'methodName: "${p}",\\n',
            'params: (typeof params !== "function") ? params : [],\\n',
            'callback: (typeof params === "function") ? params : callback\\n',
          '});\\n',
        '};\\n',
    '</clientscript>'
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
      if (clientScript != "" && !jojo.widget.widgets[prototype.widgetPath + "_glueEmitted"]) {
        serverMethods.each(function(p){
          var replacements = {
            widgetName: prototype.widgetName,
            widgetPath: prototype.widgetPath,
            p: p
          };
          var tmpl = $j.tmpl(glueTemplate, replacements);
          clientScript += "\n" + tmpl.html();
        });
        jojo.widget.widgets[prototype.widgetPath + "_glueEmitted"] = true;
      }
      return clientScript;
    };
  }
});

/**
 * Server-only instance method for emitting client code
 * This is an instance member to allow overriding easily (for instance, for a db-backed widget definition)
 * @param {Object} options
 */
var instanceScript = [
    '<clientscript type="text/javascript">',
        'jojo.stateMachine.onceState("ready", function(){\\n',
            //'debugger;\\n',
            'var widget = new ${widgetName}({\\n',
                'id: "${id}",\\n',
                'myid: "${myid}",\\n',
                'parent: ${parentStr}\\n',
            '});\\n',
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
    var tmpl = $j.tmpl(instanceScript, replacements);
    clientScript += "\n" + tmpl.html();
  return clientScript;
};

/**
 * Server-only instance method for emitting client code that will be executed within the client instance's init event
 * @param {Object} script
 */
jojo.widget.prototype.renderOnInitScript = function(script) {
  this.onInitScripts.push(script);
};
    
var onInitScript = [
    '<clientscript type="text/javascript">',
        'jojo.stateMachine.onceState("ready", function(){\\n',
          'var widget = jojo.lang.objects["${id}"];\\n',
          '${onInitScripts}\\n',
        '});\\n',
    '</clientscript>'
].join('');
/**
 * Default widget FSM server states
 */
jojo.widget.defaultStates = {
  initial: {
    stateStartup: function(widget, args) {
      if (!widget.onInitScripts) {
        widget.onInitScripts = [];
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
          var template = jojo.widget.templates.findById(widget.widgetPath);
          if (template) {
            if (template.template) {
              widget.template = template.template;
            } else {
              //some other process is loading the template... move to waiting state
              return widget.states.waitingForTemplate;
            }
          }
          if (!widget.template) {
            //go to the loading template state
            return widget.states.loadingTemplate;
          }
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
        
        //render any client-side onInit scripts that were generated for this instance
        //before doing so, append a script to fire the ready event event
        //NOTE: only do this if the widget has a client class defined
        var clientScriptItem = jojo.widgetClientFiles[widget.clientFilePath];
        if (clientScriptItem) {
          widget.renderOnInitScript("widget.fire('ready');");
          var onInitScripts = widget.onInitScripts.join("\n");          
          var replacements = {
            id: widget.id,
            onInitScripts: onInitScripts
          };
          var onInitStr = $j.tmpl(onInitScript, replacements).html();
          $j("<clientscript type='text/javascript'>" + onInitStr + "</clientscript>").appendTo(body);
        }
        
        //now render any children widgets that just got embedded
        jojo.widget.render(widget.container, widget.id + "_", widget);
      }
      //go back to whence we came
      return widget.states.initial;
    }
  },
  loadingTemplate: {
    stateStartup: function(widget, args) {
      var templateObj = {id: widget.widgetPath};
      jojo.widget.templates.add(templateObj);
      var data = fs.readFileSync(widget.templateFilePath, "utf8");
      widget.template = data;
      templateObj.template = data;
      jojo.widget.widgets.fire("templateLoaded:" + widget.widgetPath, {template: data});
      widget.fire("templateLoaded");
    },
    templateLoaded: function(widget, args) {
      return widget.previousState;
    }
  },
  waitingForTemplate: {
    stateStartup: function(widget, args) {
      jojo.widget.widgets.once("templateLoaded:" + widget.widgetPath, function(_args) {
        widget.template = _args.template;
        widget.fire("templateLoaded");
      });
    },
    templateLoaded: function(widget, args) {
      return widget.previousState;
    }
  },
  serverCallback: {
    stateStartup: function(widget, args) {
      widget.serverCallResult = {};
      try {
        var options = args.eventArgs.options;
        widget.serverCallResult.result = widget[options.methodName].apply(widget, options.params);
        widget.serverCallResult.success = true;
      } catch (ex) {
        widget.serverCallResult.success = false;
        widget.serverCallResult.message = ex.message;
      }
      return widget.previousState;
    }
  }
};

/**
 * Helper method for programmatically loading widget classes by path.
 * @param {Object} options
 */
jojo.widget.loadClass = function(path, widgetName) {
	debugger;
  if (!jojo.widget.loadedClasses.findById(path)) { //this class has not yet been defined, so load the class file now
    var filePath = jojo.appOptions.publicRoot + "/" + path + widgetName + ".server";
    require(filePath);
    jojo.widget.loadedClasses.findById(path).widgetName = widgetName;
  }
};

/**
 * Here we're recursively querying for the custom 'widget' tags starting at the document level and bootstrapping the
 * rendering process.
 */
jojo.widget.render = function(node, idPrefix, parentWidget) {
  $j("widget:first", node).each(function(index, widget) {  
    var myid = widget.getAttribute("id");
    var id = idPrefix + myid;
    
    var path = widget.getAttribute("path");
    var widgetName = path.match(/[^\/]*\/$/)[0].replace("/", "");

    jojo.widget.loadClass(path, widgetName);
    
    //the class has been defined (or should have been) so we can create the instance now and commence rendering
    var widgetClass = jojo.widget.loadedClasses.findById(path);
    if (!widgetClass) {
      throw new Error("widgetClass is undefined for path '" + path + "'");
    }
                    
    //instantiate from the top down but render from the bottom up (into parent containers of course)
    //set the options
    var options = {
      id: id,
      myid: myid,
      parent: parentWidget,
      node: widget //allow the instance to look for any special custom tags it might support or to do any other thing it might want to do to the original node to augment behavior
    };
    var el = $j(widget);
    
    //find any declaratively defined options
    el.children("options").each(function(index, optionTag) {
      $j("option", optionTag).each(function(index, _opt) {
        var name = _opt.getAttribute("name"),
          value = _opt.getAttribute("value");
        options[name] = value;
        $j(_opt).remove();
      });
    });
    
    //create the instance
    var instance = new (widgetClass.classDef)(options);
    instance.clientFilePath = jojo.appOptions.publicRoot + "/" + path + widgetName + ".client.js";
    instance.templateFilePath = jojo.appOptions.publicRoot + "/" + path + widgetName + ".template";
    
    //now emit any client.js files and instance creation scripts needed
    //note: we want this script emitted before any children's script so that
    //instantiation on the client takes place in the right order
    if (instance.getClientScript) {
      var clientScript = instance.getClientScript();
      if (clientScript && clientScript !== "") {
        //finally, emit the collected client script
        $j("<clientscript type='text/javascript'>" + clientScript + "</clientscript>").appendTo(body);
      }
    }
        
    //recurse down the children tree first so rendering goes from the bottom up
    jojo.widget.render(widget, id + "_", instance);
    
    //get the declaratively defined html for the widget if there is any
    instance.contentTemplate = el.children("contentTemplate");

    //remove the widget node from the current parent and replace with an appropriate container
    //TODO: move this into an instance method that can be overridden for custom container wrapping    
    instance.container = $j("<div id='" + id + "Container" + "'></div>").insertBefore(widget);
    el.remove(); //removes the actual "widget" tag now that a container div has been put in its place to hold any generated HTML                
    
    //let the instance handle its own rendering (usually via a FSM controller),
    //which could very likely lead into more recursions if more children are rendered dynamically
    instance.render();        
  });
  //we've finished recursing down 1 branch... continue on down the siblings now
  if ($j("widget:first", node).length > 0) { //need an exit condition to prevent infinite recursion
    jojo.widget.render(node, idPrefix, parentWidget);
  }
};