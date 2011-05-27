var simpleId = require("./simple-id")
    _ = require("underscore")._,
    eventPublisher = require("./event-publisher"),
    registry = require("./registry"),
    semaphore = require("./semaphore"),
    baseClass = require("./base-class"),
    fsm = require("./fsm"),
    logger = require("./logger"),
    widget = require("./widget");

/**
 * @namespace serves as the root namespace for the entire framework
 * @name feather
 */
var feather = exports.feather = /** @lends feather */ {

  id: simpleId,

  /**
   * Namespacing function, derived from: <a href="http://higher-order.blogspot.com/2008/02/designing-clientserver-web-applications.html">
   * http://higher-order.blogspot.com/2008/02/designing-clientserver-web-applications.html</a><br/>
   * <ul class="desc"><li>added robust support for defining namespaces on arbitrary contexts (defaults to detected environment context)</li>
   *  <li>added the fact that it returns the new namespace object regardless of the context</li>
   *  <li>added dontCreateNew flag to enable only returning an existing object but not creating new one if it doesn't exist</li></ul>
   * @param {Object} spec - the namespace string or spec object (ex: <code>{com: {trifork: ['model,view']}}</code>)
   * @param {Object} context - the root context onto which the new namespace is added (defaults to detected environment context)
   */
  ns: (function() {
    var validIdentifier = /^(?:[a-zA-Z_]\w*[.])*[a-zA-Z_]\w*$/,i,N;
    return function(spec, _context, dontCreateNew) {
      _context = _context || global;
      spec = spec.valueOf();
      var ret;
      if (typeof spec === 'object') {
        if (typeof spec.length === 'number') {//assume an array-like object
          for (i=0,N=spec.length;i<N;i++) {
               ret = feather.ns(spec[i], _context);
          }
        }
        else {//spec is a specification object e.g, {com: {trifork: ['model,view']}}
          for (i in spec) if (spec.hasOwnProperty(i)) {
            _context[i] = _context[i] || {};
             ret = feather.ns(spec[i], _context[i]);//recursively descend tree
          }
        }
      } else if (typeof spec === 'string') {
        ret = (function handleStringCase(){
         var parts;
         if (!validIdentifier.test(spec)) {
             throw new Error('"'+spec+'" is not a valid name for a package.');
         }
         parts = spec.split('.');
         for (i=0,N=parts.length;i<N;i++) {
           spec = parts[i];
           if (!dontCreateNew) {
             _context[spec] = _context[spec] || {};
           }
           _context = _context[spec];
           if (typeof _context === "undefined") break;                       
         }
         return _context; // return the lowest object in the hierarchy
        })();
      }
      else {
         throw new Error("feather.ns() requires a valid namespace spec to be passed as the first argument");
      }
      return ret;
    };
  })(),

  /**
   * This function should allow the original object to be extended in such a way that if the 
   * new object (n) already contains a property of the old (o) and it is an object, it delves 
   * into the old object and overrides individual properties instead of replacing the whole 
   * object.  Likewise, if a property is an array, it should concatenate the new onto the old
   * rather than replacing the entire array (think config.json: resources.packages property).
   */
  recursiveExtend: function(n, o) {
    var type = null;
    for (var p in o) {
      
      if (n[p] && typeof(n[p]) === "object") {
        n[p] = feather.recursiveExtend(n[p], o[p]);
      } else if (n[p] && typeof(n[p]) === "array" && o[p] && typeof(o[p]) === "array") {
        n[p] = o[p].concat(n[p]);
      } else {
        n[p] = o[p];
      }
    }
    return n;
  },
  
  /**
   * Flyweight empty Function
   * @memberOf feather
   */
  emptyFn: function() {},
  
  /**
   * Flyweight empty Object
   */
  emptyObj: {},
  
  /**
   * Flyweight empty String
   */
  emptyString: "",
  
  /**
   * Flyweight empty Array
   */
  emptyArray: [],

  /**
   * Framework init function
   * @param {Object} options
   */
  init: function(options) {

    options = options || {};
    options.featherRoot = options.featherRoot || "./";
    options.appRoot = options.appRoot || __dirname;
    options.publicRoot = options.publicRoot || options.appRoot + "/public";
    options.port = options.port || 8080;
    options.socketPort = options.socketPort || 8081;
    options.states = options.states || {};
    options.states.ready = options.states.ready || {
      request: function(fsm, args) {
        var res = args.eventArgs.response;
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('feather was started with no custom request handler.\n');
      }  
    };
    
    feather.appOptions = options;

    // event.js stuff


    // fsm.js stuff
    var states = feather.fsm.defaultStates;
    if (options.states) {
      _.extend(states, options.states);
    }
    feather.stateMachine = new fsm({
      states: states
    });

    if (options.fsmListeners && options.fsmListeners.length > 0) {
      options.fsmListeners.forEach(function(l) {
        feather.stateMachine.on(l.eventName, l.fn);
      });
    }

    // logger.js stuff

    /**
     * A singleton instance of {@link feather.logging.logger} for use in apps.
     * @name feather.logger
     */
    global.logger = feather.logger = new feather.logging.logger();

    // Data stuff
    var dataInterface = null;
    if (options.data.appdb || options.data.authdb) {
      dataInterface = require("./data");
    }
    if (options.data.appdb) {
      feather.data.appdb = new dataInterface(options.data.appdb);
    }
    if (options.data.authdb) {
      feather.data.authdb = new dataInterface(options.data.authdb);
    }

    require("./server").init(feather);
  },
  
  /**
   * Shuts down the server cleanly, but not before it is ready for requests.
   */
  shutdown: function() {
    if (feather.stateMachine) {
      feather.stateMachine.onceState("ready", function() {
        if (feather.server) {
          try {
            feather.server.close();
          } catch (exception) {
            feather.logger.error({message: "Error while shutting down http server: " + exception.message, category:'feather.srvr', exception: exception, immediately:true});
          }
          //process.exit(0);
        } else {
          feather.logger.error({message:"feather server cannot shut down.  feather.server is undefined", category:"feather.srvr"});
        }
        if (feather.socket.server) {
          try {
            feather.socket.server.server.close();
          } catch (exception) {
            feather.logger.error({message: "Error while shutting down socket server: " + exception.message, category:'feather.srvr', exception: exception, immediately:true});
          }

        } else {
          feather.logger.error({message:"feather socket server cannot shut down.  feather.server is undefined", category:"feather.srvr"});
        }
        process.nextTick(function() {
          process.exit(0);
        });
      });
    } else {
      feather.logger.error({message:"feather server cannot shut down.  feather.stateMachine is undefined", category:"feather.srvr"});
    }
  }, // end shutdown.
  
  start: function(options) {
    options = options || {};
    
    if (options.daemon.runAsDaemon) {
      var daemon = require("daemon");
      daemon.daemonize(options.daemon.outputPath, options.daemon.pidPath, function(err, pid) {
        feather.init(options);
      });
    } else {
      feather.init(options);
    }
  },
  /**
   * Flyweight empty Function
   * @memberOf feather
   */
  emptyFn: function() {},
  
  /**
   * Flyweight empty Object
   */
  emptyObj: {},
  
  /**
   * Flyweight empty String
   */
  emptyString: "",
  
  /**
   * Flyweight empty Array
   */
  emptyArray: [],

  /**
   * @namespace Root namespace for data class definitions and services
   * @name feather.data
   */
  data: {
    // Content is added in init function.
  },

  /**
   * @namespace provides the lang namespace inside of the framework
   * @name feather.lang
   */
  lang: {
    baseClass: baseClass,
    registry: registry,
    semaphore: semaphore
  },

  /**
   * A local registry to manage cached resource groups
   */
  resourceCaches: new registry(),

  /**
   * @namespace Root namespace for Finite State Machine class definitions and services
   * @name feather.fsm
   */
  fsm: {
    
    finiteStateMachine: fsm,
    
    /**
     * A static flyweight state transition function for returning to the original state of the FSM instance
     * @param {Object} fsm
     * @param {Object} args
     */
    gotoInitialState: function(fsm, args) {
      return fsm.states.initial;
    },
    /**
     * A static flyweight state transition function for going to an error state
     * @param {Object} fsm
     * @param {Object} args
     */
    gotoErrorState: function(fsm, args) {
      return fsm.states.error;
    },
    /**
     * A static flyweight state transition function for going to the previous state
     * @param {Object} fsm
     * @param {Object} args
     */
    gotoPreviousState: function(fsm, args) {
      return fsm.previousState;
    },
    /**
     * A static flyweight empty state (just an alias for feather.emptyObj)
     * note: using this alias in case feather.fsm.emptyState ever needs to be more than an empty object
     */
    emptyState: this.emptyObj,

    defaultStates: {
      initial: {
        stateStartup: function(fsm, args) {
            //go right to the "loading state" since that is exactly what we're doing at the time this instance is created
            return fsm.states.loading;
        }
      },
      loading: {
        loadingComplete: function(fsm, args) {
          //once everything is loaded, go to the ready state
          return fsm.states.loadingComplete;
        }
      },
      loadingComplete: {
        startup: function(fsm, args) {
          // Run one-time startup function if it exists.
          if (feather.appOptions.onStartup && typeof(feather.appOptions.onStartup) === "function") {
            feather.appOptions.onStartup();
          }
        },
        ready: function(fsm, args) {
          // Before moving to the ready state, add a hook for clean shutdown to the process itself.
          process.on('SIGINT', function() {
            feather.shutdown();
          });
          process.on('SIGTERM', function() {
            feather.shutdown();
          });
          return fsm.states.ready;
        }
      },
      ready: {}
    }
  }, // end fsm

  /**
   * @namespace contains all things related to logging.
   * @name feather.logging
   */
  logging: {
    logger: logger
  },

  widget: {

    widget: widget,

    /**
     * A registry to cache already loaded classes to prevent duplicate loads.
     * This registry will enforce unique ids and will fire events when items are added (allow other code to listen and take action if needed)
     * @static
     * @memberOf feather.widget
     * @see feather.lang.registry
     */
    loadedClasses: new registry(),

    /**
     * A registry to cache all widget instances to allow other code to listen and take action as needed.
     * @static
     * @memberOf feather.widget
     * @see feather.lang.registry
     */
    widgets: new registry(),

    /**
     * Helper factory method for creating widget subclass definitions.
     * This will allow other code to be injected into the class loading pipeline as needed,
     * as well as handle common concerns for FSM and templating setup.
     * @static
     * @memberOf feather.widget
     * @param {Object} options
     */
    create: function(options) {
      var classObj = feather.widget.loadedClasses.findById(options.path);
      if (!classObj) {
        classObj = {
          id: options.path,
          name: options.name
        };
        options.prototype.widgetPath = options.path;
        options.prototype.widgetName = options.name;
        //fire an event that will allow outside code to have a say in how the class gets constructed,
        //for example: to decorate the prototype object as needed            
        feather.widget.widgets.fire("beforeWidgetClassCreation", {
          options: options
        });
        var classDef = Class.create(feather.widget, options.prototype);
        classObj.classDef = classDef;
        feather.widget.loadedClasses.add(classObj);
      }
      return classObj.classDef;
    },

    /**
     * tag the supplied function as a server method, so that code gets emitted to the client
     * to abstract the process of calling back to the server representation of the instance method
     * @param {Object} method
     */
    serverMethod: function(method) {
      method.isServerMethod = true;
      return method;
    },

    getInstance: function(options) {
      var parts = options.widgetName.split(".");
      feather.widget.loadClass(options.widgetPath, parts[parts.length - 1]);
      var classObj = feather.widget.loadedClasses.findById(options.widgetPath);
      if (classObj) {
        return new (classObj.classDef)(options);
      }
      return null;
    },

    getClientScript: function(options) {
      var me = this; //this == the widget instance
      var clientScript = "";
      var clientScriptItem = feather.widgetClientFiles[me.clientFilePath];
      if (!clientScriptItem) {
        throw new Error("No widget client file found for widget: " + me.widgetName);
      }
      //a client.js file exists and was loaded, so we need an instance creation script now
      var parentStr = me.parent ? "feather.widget.widgets.findById('" + me.parent.id + "')" : "null";
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
      var tmpl = (_instanceScript || feather.widget.instanceScriptTemplate)(feather.dom.$j, {
        data: replacements
      }).join("");
      clientScript += "\\n" + tmpl;
      return clientScript;
    },

    /**
     * Helper method for programmatically loading widget classes by path.
     * @param {Object} options
     * @static
     */
    loadClass: function(path, widgetName) {
      var widgetClass = feather.widget.loadedClasses.findById(path);
      if (!widgetClass) { //this class has not yet been defined, so load the class file now
        var filePath = feather.appOptions.publicRoot + "/" + path + widgetName + ".server";
        require(filePath);
        var widgetClass = feather.widget.loadedClasses.findById(path);
        widgetClass.widgetName = widgetName;
        widgetClass.fsWidgetPath = feather.appOptions.publicRoot + "/" + path + widgetName;
        widgetClass.clientFilePath = feather.appOptions.publicRoot + "/" + path + widgetName + ".client.js";
        widgetClass.clientHrefPath = "/" + path + widgetName + ".client.js";
        widgetClass.templateFilePath = feather.appOptions.publicRoot + "/" + path + widgetName + ".template.html";
        widgetClass.template = feather.templateFiles[widgetClass.templateFilePath].data || " ";
        widgetClass.clientCssFilePath = feather.appOptions.publicRoot + "/" + path + widgetName + ".css";
        widgetClass.clientCssHrefPath = "/" + path + widgetName + ".css";
      }
      return widgetClass;
    },

    /**
     * Renders a widget
     * @param {Object} renderOptions
     * @param {Object} callback
     * @static
     */
    render: function(renderOptions, callback) {
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
        var widgetClass = feather.widget.loadClass(path, widgetName);
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
        feather.widget.render(_.extend(_.clone(renderOptions), {
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
        feather.widget.render(renderOptions);
      }
      
      if (typeof callback === "function") {
        result.scripts = scripts;
        result.widgetClassRegistry = widgetClassRegistry;
        result.widgets = widgets;
        callback(result);
      }
    }
  }
}; // end exports.feather
console.log(require("util").inspect(feather));