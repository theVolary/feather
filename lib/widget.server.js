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
    '<script type="text/javascript">',
        '${widgetName}.prototype.server_${p} = function(params, callback) {',
          'this.serverCall({',
            'widgetName: "${widgetName}",',
            'widgetPath: "${widgetPath}",',
            'id: this.id,',
            'methodName: "${p}",',
            'params: (typeof params !== "function") ? params : [],',
            'callback: (typeof params === "function") ? params : callback',
          '});',
        '};',
    '</script>'
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
          sys.puts("tmpl glue: " + glueTemplate)
          var tmpl = $j.tmpl(glueTemplate, replacements);
          sys.puts("TMPL: " + tmpl.html());
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
    '<script type="text/javascript">',
        'jojo.stateMachine.onceState(jojo.stateMachine.states.ready, function(){',
            'var widget = new ${widgetName}({',
                'id: "${id}",',
                'myid: "${myid}",',
                'parent: ${parentStr}',
            '});',
        '});',
    '</script>'
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
    sys.puts("tmpl instance: " + instanceScript);
    var tmpl = $j.tmpl(instanceScript, replacements);
    sys.puts("TMPL: " + tmpl.html());
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
    '<script type="text/javascript">',
        'jojo.stateMachine.onceState(jojo.stateMachine.states.ready, function(){',
          'var widget = jojo.lang.objects["${id}"];',
          'widget.on("init", function() {',
            '${onInitScripts}',
          '}.bind(widget), null, 0); //this codeblock should be the first init handler to execute',
          'widget.fire("init");',
        '});',
    '</script>'
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
        //widget.container.html(html || "");
        widget.html = widget.container.html();
        
        //render any client-side onInit scripts that were generated for this instance
        //before doing so, append a script to fire the ready event
        //NOTE: only do this if the widget has a client class defined
        var clientScriptItem = jojo.widgetClientFiles[widget.clientFilePath];
        if (clientScriptItem) {
          widget.renderOnInitScript("this.fire('ready');");
          var onInitScripts = widget.onInitScripts.join("\n");          
          var replacements = {
            id: widget.id,
            onInitScripts: onInitScripts
          };
          sys.puts("tmpl oninit: " + onInitScript);
          var onInitStr = $j.tmpl(onInitScript, replacements).html();
          sys.puts("TMPL: " + onInitStr);
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
  if (!jojo.widget.loadedClasses.findById(path)) { //this class has not yet been defined, so load the class file now
    var filePath = jojo.appOptions.publicRoot + "/" + path + widgetName + ".server";
    require(filePath);
  }
};

/**
 * Here we're recursively querying for the custom 'widget' tags starting at the document level and bootstrapping the
 * rendering process.
 */
jojo.widget.render = function(node, idPrefix, parentWidget) {
  while (node !== null) {
    var widgets = $j("widget:first", node);
    widgets && widgets.each(function(index, widget) {  
      sys.puts("widget properties: " + widget);
      var myid = widget.getAttribute("id");
      jojo.logger.log("myid: " + myid);
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
        var innerOptions = $j("option", optionTag);
        innerOptions && innerOptions.each(function(index, _opt) {
          var name = _opt["name"],
            value = _opt["value"];
          options[name] = value;
          $j(_opt).remove();
        });
        if (optionTag.innerHTML.replace(/\s/g, "") != "") {
          options = Object.extend(options, eval("(" + optionTag.innerHTML + ")") || {});
        }
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
      jojo.widget.render(widget, id + "_");
      
      //get the declaratively defined html for the widget if there is any
      var contentTemplate = el.children("contentTemplate");
      var html = contentTemplate ? contentTemplate.innerHTML : "";

      //remove the widget node from the current parent and replace with an appropriate container
      //TODO: move this into an instance method that can be overriden for custom container wrapping
      $j("<div id='" + id + "Container" + "'></div>").insertBefore(widget);
      instance.container = $j("#" + id + "Container");
      el.remove(); //removes the actual "widget" tag now that a container div has been put in its place to hold any generated HTML                
      
      //let the instance handle its own rendering (usually via a FSM controller),
      //which could very likely lead into more recursions if more children are rendered dynamically
      instance.html = html;
      instance.render();   
      sys.puts("widget id: " + instance.id);
        
    });
    widgets = $j("widget:first", node);
    if (!widgets || widgets.length == 0) {
      node = null;
    }
  }        
};