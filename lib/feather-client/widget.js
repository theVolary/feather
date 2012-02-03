(function() {

  //note: id regex looks a bit complex due to the need to exclude <widget> tags from this process
  var idFixRegex                  = /<(([^w\/\s]|w[^i\s]|wi[^d\s]|wid[^g\s]|widg[^e\s]|widge[^t\s])*)\s([^>]*id=['"])([^'"\$]*)(['"][^>]*)>/g,
      widgetTagFixRegex           = /<(\/*)widget/g,
      optionsTagFixRegex          = /<(\/*)options/g,
      optionTagFixRegex           = /<(\/*)option(\s|>)/g,
      contentTagFixRegex          = /<(\/*)content(\s|\/)/g,
      contentTemplateTagFixRegex  = /<(\/*)contentTemplate/g,
      selectOptionTagFixRegex     = /<(\/*)select\_option/g,
      selectTagBodyRegex          = /<select([^>]*)>(([^<]|<[^\/\s]|<\/[^s\s]|<\/s[^e\s]|<\/se[^l\s]|<\/sel[^e\s]|<\/sele[^c\s]|<\/selec[^t\s])*)<\/select>/g,
      widgetSelector              = $.browser.msie ? "widget" : "feather\\:widget",
      optionsSelector             = $.browser.msie ? "options" : "feather\\:options",
      optionSelector              = $.browser.msie ? "option" : "feather\\:option",
      contentTemplateSelector     = $.browser.msie ? "contentTemplate" : "feather\\:contentTemplate",
      contentSelector             = $.browser.msie ? "content" : "feather\\:content";
  
  /**
   * This function auto-fixes embedded custom tags on the client to conform to the stricter browser xmlns requirements
   */
  function fixXMLNS(content, skipIds) {
    var selectMatches
    while (selectMatches = selectTagBodyRegex.exec(content)) {
      var smOptions = selectMatches[2].replace(optionTagFixRegex, "<$1select_option$2");
      var outer = selectMatches[0].replace(selectMatches[2], smOptions);
      content = content.replace(selectMatches[0], outer);
    }
    if (!skipIds) {
      content = content.replace(idFixRegex, "<$1 $3${id}_$4$5>");
    }
    content = content
      .replace(widgetTagFixRegex, "<$1feather:widget")
      .replace(optionsTagFixRegex, "<$1feather:options")
      .replace(optionTagFixRegex, "<$1feather:option$2")
      .replace(contentTemplateTagFixRegex, "<$1feather:contentTemplate")
      .replace(contentTagFixRegex, "<$1feather:content$2")
      .replace(selectOptionTagFixRegex, "<$1option"); //always fix last
    return content
  }

  /**
   * @class This is the public interface to return for the feather.Widget class definition.
   *   The base class is feather.FiniteStateMachine, therefore all widgets must
   *   be instantiated with at least an 'initial' state definition.
   * @extends FiniteStateMachine
   * @constructs
   * @param {Object} options The configuration options for the instance
   */
  var Widget = feather.Widget = function(options) {
    var me = this;
    options = options || {};
    options.states = options.states || feather.Widget.defaultStates;
    Widget._super.apply(this, arguments);
    
    //dom management objects
    this.domEvents = new feather.DomEventCache();
    
    //data model (used in auto two-way datalinking)
    this.model = options.model || {};
    this.datalinkOptions = options.datalinkOptions;

    if (typeof this.contentTemplate === "string") {      
      this.contentTemplate = fixXMLNS(this.contentTemplate);
    }
    
    //container options
    this.containerOptions = options.containerOptions;
    this.container = options.container;
    this.containerId = options.containerId;
    this.keepContainerOnDispose = options.keepContainerOnDispose;
    if (this.container) {
      this.containerId = this.container.attr("id");
      if (this.options.html) this.container.html(this.options.html);
    } else if (this.containerId) {
      this.onceState("ready", function() {
        me.container = $(me.containerId);
        if (me.container && me.container.length && this.options.html) this.container.html(this.options.html);
      });
    } else if (this.containerOptions) {
      var containerizer = this.containerOptions.containerizer;
      if (!containerizer || typeof containerizer === "string") {
        containerizer = feather.Widget.containerizers[containerizer || "default"];
        if (typeof containerizer.containerize === "function") containerizer = containerizer.containerize;
      }
      if (containerizer && typeof containerizer === "function") {
        containerizer(this);
        if (this.container && this.options.html) this.container.html(this.options.html);
      }
    } else { 
      var container = this.get("#Container");
      if (container.length) {
        this.container = container;
      }
      var classObj = feather.Widget.loadedClasses.findById(this.widgetPath);
      if (classObj.clientOnly) {
        //this.render();
      } else {
        //in case any clientOnly widgets were rendered from the server template
        this.suppress(["init", "ready"], true);
        feather.Widget.render({
          node: me.container,
          idPrefix: me.id + "_",
          parentWidget: me
        }, function(err, _result) {
          if (me.server_onRequest) {
            me.server_onRequest(function(args) {
              if (args.success) {
                if (typeof me.onRequest === "function") {
                  me.onRequest(args.result);
                }
                me.unsuppress(["init", "ready"]);
              }
            });
          } else {
            me.unsuppress(["init", "ready"]);
          }
        });  
      }
    }
    
    this.myid = options.myid; //the shortened version of the auto prefixed long id (note: this can be a collision with other widgets so don't rely on it too much; its main use is to auto-attach an instance property for children)
    
    //children/parent relationships
    if (options.parent) {
      this.setParent(options.parent);
    }
    
    //add this instance to the widget registry
    feather.Widget.widgets.add(this);

    if (typeof this.onInit === "function") this.onInit.apply(this, arguments);

    //load css if needed
    if (!feather.Widget.resources.findById(this.widgetPath + ".css")) {
      var widgetName = this.widgetPath.match(/[^\/]*\/$/)[0].replace("/", "");
      var href = "/" + this.widgetPath + widgetName + ".css";
      feather.util.loadStylesheet(href);
      feather.Widget.resources.add({id: this.widgetPath + ".css"});
    }   
  };

  Widget.template = [
    '<feather:widget id="${id}" path="${path}">',
      '{{if options}}',
        '<feather:options>',
          '{{each(i, option) options}}',
            '<feather:option name="${name}" value="{{html value}}" />',
          '{{/each}}',
        '</feather:options>',
      '{{/if}}',
      '{{if contentTemplate}}',
        '<feather:contentTemplate>',
          '{{html contentTemplate}}',
        '</feather:contentTemplate>',
      '{{/if}}',
    '</feather:widget>'
  ].join("");

  Widget.prototype = {
    setParent: function(_parent) { //can't use 'parent' as that is a reserved js object for the parent frame
      _parent.children = _parent.children || new feather.Registry({
        on: {
          itemAdded: function(item) {
            item.on("disposed", function() {
              _parent.children && _parent.children.remove(item);
            });
          }
        }
      });
      _parent.children.add(this);
      this.myid && (_parent[this.myid] = this);
      this.parent = _parent;
    },
    datalink: function(options) {
      var me = this;
      options = options || me.datalinkOptions;
      //for now, automatic datalinking is predicated on finding one or more forms with a 'datalink' attribute
      me.get("form").each(function(index, form) {
        var datalink = $(form).attr("datalink");
        if (datalink) {
          feather.ns("model." + datalink, me);
          //unlinking and then linking to allow this to be called multiple times to enable dynamic form building scenarios
          $(form).unlink(me.model[datalink]);
          $(form).link(me.model[datalink], options);
          for (var p in me.model[datalink]) {
            $("[name=" + p + "]", form).each(function(index, field) {
              $(field).val(me.model[datalink][p]);
            });
          }
        }
      });
    },    
    /**
     * widget-scoped jQuery selector method
     * @param {String} selector
     */
    get: function(selector) {
      //fix id based selectors (if you are trying to do an absolute ID selector not scoped to this widget, just use $() instead of this.$())
      if (selector.indexOf("#") == 0) {
        selector = "#" + this.id + "_" + selector.substr(1);
      }
      var el = $(selector, this.container || null);
      return el;
    },    
    /**
     * Initiates rendering of the widget
     * @param {Object} options
     */
    render: function(options, cb) {
      this.fire("render", options, cb); // behavior implemented via FSM controller        
    },    
    /**
     * Disposes of the widget
     * @param {Object} $super
     */
    dispose: function() {
      feather.Widget.widgets.remove(this);
      if (this.domEvents) {
        this.domEvents.dispose();
      }
      //kill the children
      if (this.children && this.children.items.length) {
        _.each(_.clone(this.children.items), function(child) {
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
      Widget._super.prototype.dispose.apply(this, arguments);
    }
  };
  inherits(Widget, feather.FiniteStateMachine);
  
  /**
   * simple registry for containerizers
   */
  Widget.containerizers = {};
  
  /**
   * Default widget FSM client states
   */
  Widget.defaultStates = {
    initial: {
      stateStartup: function() {
      
      },
      render: function() {
        //move to the rendering state (if present)
        return this.states.rendering;
      },
      ready: function() {
        return this.states.ready;
      }
    },
    ready: {//this state indicates rendering has completed, the widget's DOM is ready for manipulation (if the widget has a UI)
      stateStartup: function(args, cb) {
        //auto datalink model objects to forms
        this.datalink();
        if (!this.isReady && this.onReady) { //only execute the inline onReady method once
          var args = _.toArray(arguments);
          this.fire.apply(this, ["beforeReady"].concat(args));
          this.fire.apply(this, ["inlineReady"].concat(args)); //implementing this way to allow potential suppression or other scenarios                    
        }
        this.isReady = true;

        if (typeof cb === "function") cb();
      },
      inlineReady: function(args) {
        this.onReady.call(this, args);
      }
    },
    rendering: {
      stateStartup: function(args, cb) {
        var classObj = feather.Widget.loadedClasses.findById(this.widgetPath);
        if (classObj.clientOnly) {
          if (classObj.template) {
            var me = this;
            me.template = classObj.template;

            //invoke onRender function if implemented
            if (typeof me.onRender === "function") me.onRender(args);

            if (me.container /*&& args*/) {
              //match server version (minimize differences)
              var $j = $;
              
              //if we're still in this state, finish rendering
              // var _t = $j.template(null, me.template);
              $j.tmpl(me.template, me).appendTo(me.container);
              // me.container.html(_t($j, {data: me}).join(""));
              
              //TODO: evaluate whether to add in the custom tag handler functionality on the client-side
              //loop the custom tags and execute their handlers
              // tagHandlers.each(function(tagHandler) {
              //   $j(tagHandler.id, me.container).each(function(index, tag) {
              //     //throw if any defined disallowed tags for this handler are found to be embedded
              //     if (tagHandler.disallowedTags) {
              //       _.each(tagHandler.disallowedTags, function(disallowed) {
              //         if ($j(disallowed, tag).length > 0) throw new Error("Cannot embed '" + disallowed + "' tags within '" + tagHandler.id +"' tags.");
              //       });
              //     }
              //     tagHandler.renderer({
              //       tag: tag,
              //       widget: me,
              //       renderOptions: args,
              //       dom: args.dom
              //     });
              //   });
              // });
              
              if (me.contentTemplate) {
                if (typeof me.contentTemplate === "string") me.contentTemplate = $j('<feather:contentTemplate>' + me.contentTemplate + '</feather:contentTemplate>');
                var tmpl = $j.tmpl(me.contentTemplate.html(), me);
                if (tmpl && tmpl.appendTo) {
                  if ($j(contentSelector, me.container).length) {
                    $j(contentSelector, me.container).each(function(index, content){
                      var div = $j("<div class='widgetContent'></div>").insertBefore(content);
                      $j(content).remove();
                      tmpl.clone().appendTo(div);
                    });
                  } else {
                    var div = $j("<div class='widgetContent'></div>").appendTo(me.container);
                    tmpl.clone().appendTo(div);
                  }
                }
              }
              
              //now render any children widgets that just got embedded
              feather.Widget.render(_.extend(_.clone(args), {
                node: me.container,
                idPrefix: me.id + "_",
                parentWidget: me
              }), function(err, _result) {
                me.fire("ready", args, cb);
              });  
            }
          } else {
            this.fire("ready");
          }
        } else {
          throw new Error(".render() should not be called directly for server-based widgets.");
        }
      },
      ready: function() {
        return this.states.ready;
      }
    }
  };
  
  /**
   * A registry to cache already loaded classes to prevent duplicate loads.
   * This registry will enforce unique ids and will fire events when items are added (allow other code to listen and take action if needed)
   * @static
   * @memberOf Widget
   * @see Registry
   */
  Widget.loadedClasses = new feather.Registry();
  
  /**
   * A registry to cache all widget instances to allow other code to listen and take action as needed.
   * @static
   * @memberOf Widget
   * @see Registry
   */
  Widget.widgets = new feather.Registry();

  /**
   * A registry that can be used to cache complex options values that would otherwise have to undergo a serialization/deserialization phase
   * during a feather.Widget.render cycle.
   */
  Widget.optionsRegistry = new feather.Registry();


  /**
   * A registry to track widget resources (css and js files) to know when/when not to load them.
   * This is mostly used for widgets loaded dynamically via feather.Widget.load()
   */
  Widget.resources = new feather.Registry();


/* BEGIN CLIENT PORT OF WIDGET RENDERING CODE FROM SERVER SIDE TO ENABLE CLIENT BASED PROCESSING ------------------------------------------------------ */
//TODO: Refactor this stuff to live in a singly maintained location shared between server and client parsers

  //aliases to minimize code-change from server-side version
  //TODO: refactor to proper single code file
  var Registry = feather.Registry,
    Widget = feather.Widget,
    loadedClasses = feather.Widget.loadedClasses;

  /**
   * Helper method for programmatically loading widget classes by path.
   * @param {Object} options
   * @static
   */
  Widget.loadClass = function(path, widgetName, cb) {
    var widgetClass = loadedClasses.findById(path);

    if (!widgetClass) { //this class has not yet been defined, so load the class file now
      var filePath = "/" + path + widgetName + ".client.js";
      feather.util.loadScripts({
        files: [filePath],
        callback: function() {
          widgetClass = loadedClasses.findById(path);
          cb(null, widgetClass);
        }
      });   
    } else {
      cb(null, widgetClass);
    } 
  };

  /**
   * Initiates a recursive rendering process inside the supplied DOM (always 'window' when run on the client side),
   * starting from the element specified.
   *
   * @param {Object} renderOptions
   * @param {Object} callback
   * @static
   */
  Widget.render = function(renderOptions, callback) { 
    var dom = window,
      document = dom.document,
      $j = dom.$,
      body = $j('body')[0];
    
    renderOptions.result              = renderOptions.result || {};
    renderOptions.node                = renderOptions.node || document;
    renderOptions.idPrefix            = renderOptions.idPrefix || "";
    renderOptions.level               = renderOptions.level || 0;
    
    var result            = renderOptions.result,
      node                = renderOptions.node, 
      idPrefix            = renderOptions.idPrefix, 
      parentWidget        = renderOptions.parentWidget, 
      level               = renderOptions.level;
      
    result.renderers = result.renderers || [];
    
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
    if ($j(widgetSelector, node).length > 0) {
      $j(widgetSelector, node).each(function(index, widgetEl) {
        //since this "loop" must be controlled in an async manner, exit on all indexes but the first and let exit condition
        //async code handle future iterations (see bottom of loop to see what I mean here)
        if (index > 0) return;

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
            if (err) callback(err); else {                              
              //instantiate from the top down but render from the bottom up (into parent containers)...

              //set the options
              var options = {
                id: id,
                myid: myid
              };
              var el = $j(widgetEl);
              
              //find any declaratively defined options
              el.children(optionsSelector).each(function(index, optionTag) {
                $j(optionSelector, optionTag).each(function(index, _opt) {
                  var name = _opt.getAttribute("name"),
                    value = _opt.getAttribute("value"),
                    v = value;                  
                  if (name.match(/opt:/)) {
                    var optId = name.split(":")[1];
                    var opt = Widget.optionsRegistry.findById(optId);
                    if (opt) {
                      options[opt.key] = opt.value;
                      Widget.optionsRegistry.remove(opt);
                    }
                  } else {
                    try {
                      value = v.replace(/\\n/g, '\n');
                      options[name] = JSON.parse(value);
                    } catch (ex) {
                      //try reversing the newline regex
                      value = v.replace(/\n/g, '\\n');
                      try {
                        options[name] = JSON.parse(value);
                      } catch (ex) {
                        options[name] = v.replace(/\\n/g, '\n');
                      }
                    }
                  }
                  $j(_opt).remove();
                });
              });

              if (!widgetClass.clientOnly) {
                //get the declaratively defined html for the widget if there is any
                var serverOptions = _.clone(options);
                var contentTemplate = el.children(contentTemplateSelector);
                if (contentTemplate.length) {
                  var content = contentTemplate.html();
                  serverOptions.content = content;
                  contentTemplate.remove();
                }
                var container = $j('<div id="' + id + '_Container"></div>').insertBefore(widgetEl);
                el.remove(); //removes the actual "widget" tag now that a container div has been put in its place to hold any generated HTML 
                feather.Widget.load({
                  path: path,
                  id: id,
                  clientOptions: _.extend({
                    parent: parentWidget,
                    container: container,
                    onceState: {
                      ready: function() {
                        callback(null, result);
                      }
                    }
                  }, options),
                  serverOptions: serverOptions
                });
              } else {
                options.parent = parentWidget;
                //create the instance and cache some file and class info
                var instance = new (widgetClass.classDef)(options);
                    
                //recurse down the children tree first so rendering goes from the bottom up
                Widget.render(_.extend(_.clone(renderOptions), {
                  node: widgetEl,
                  idPrefix: id + "_",
                  parentWidget: instance,
                  level: level++//,
                  //scripts: instance.scripts
                }), function(err) {
                  if (err) callback(err); else {
                    //get the declaratively defined html for the widget if there is any
                    instance.contentTemplate = instance.contentTemplate || el.children(contentTemplateSelector);
                    if (typeof instance.contentTemplate === "string") instance.contentTemplate = $j('<feather:contentTemplate>' + instance.contentTemplate + '</feather:contentTemplate>');

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
                    el.remove(); //removes the actual "widget" tag now that a container div has been put in its place to hold any generated HTML                
                    
                    //let the instance handle its own rendering (usually via a FSM controller),
                    //which could very likely lead into more (pseudo)recursions if more children are rendered dynamically
                    instance.render(renderOptions, function(err) { 
                      if (err) callback(err); else {
                        //we've finished recursing down 1 branch... continue on down the siblings now
                        if ($j(widgetSelector, node).length > 0) { //need an exit condition to prevent infinite (pseudo)recursion
                          Widget.render(renderOptions, callback);
                        } else {  
                          if (typeof callback === "function") {
                            callback(null, result);
                          }     
                        } 
                      }
                    }); 
                  }            
                }); 
              }
            }
          });
        }
      });
    } else {  
      if (typeof callback === "function") {
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
    var classObj = feather.Widget.loadedClasses.findById(options.path);
    if (!classObj) {
      classObj = {
        id: options.path,
        name: options.name,
        clientOnly: options.clientOnly,
        template: options.template
      };
      //parse for id="" attributes and add the "${id}_" tokens
      if (classObj.template) {
        classObj.template = fixXMLNS(classObj.template);
      }
      if (options.inherits) {
        var inheritedClass = feather.Widget.loadedClasses.findById(options.inherits.prototype.widgetPath);
        if (inheritedClass) {
          classObj.template = classObj.template || inheritedClass.template;
        }
      }
      
      //setup the prototype
      options.prototype = options.prototype || {};
      options.prototype.widgetPath = options.path;
      options.prototype.widgetName = options.name;
      options.prototype.template = classObj.template;
      var classDef = options.prototype.ctor || function() {
        classDef._super.apply(this, arguments);        
      };
      options.prototype.ctor && (delete options.prototype.ctor);
      classDef.prototype = options.prototype;
      inherits(classDef, options.inherits || Widget);
      classObj.classDef = classDef;
      feather.Widget.loadedClasses.add(classObj);
    }
    return classObj.classDef;
  };
  
  /**
   * Helper method for loading widgets from the server.
   * @static
   * @memberOf Widget
   * @param {Object} options
   */
  Widget.load = function(options) {
    options.id = options.id || feather.id();
    feather.ns("serverOptions", options);
    feather.ns("clientOptions", options);
    options.serverOptions.id = options.serverOptions.id || options.id;
    options.clientOptions.id = options.clientOptions.id || options.id;
    var widgetClass = feather.Widget.loadedClasses.findById(options.path);
    if (widgetClass && widgetClass.clientOnly) {
      var widget = new (widgetClass.classDef)(options.clientOptions);
      widget.render();
    } else {
      var loadWidgetCallback = function(args) {
        var cb = function() {
          //handle the clientOnly case
          var widgetClass = feather.Widget.loadedClasses.findById(options.path);
          if (widgetClass && widgetClass.clientOnly) {
            var widget = new (widgetClass.classDef)(options.clientOptions);
            widget.render();
          } else {
            //'regular' server based widget case
            options.clientOptions.html = fixXMLNS(args.result.html, true);
            if (args.result.script) {
              var func = eval("({fn: " + args.result.script + "})");
              func.fn(options.clientOptions);
            }
          }
        };
        var files = [];
        _.each(args.result.widgetClasses, function(widgetClass) {
          if (!feather.Widget.loadedClasses.findById(widgetClass)) {
            var widgetName = widgetClass.match(/[^\/]*\/$/)[0].replace("/", "");
            files.push("/" + widgetClass + widgetName + ".client.js");
          }
        });
        if (files.length == 0) {
          cb(); 
        } else {
          feather.util.loadScripts({
            files: files,
            callback: cb
          });
        }
      };
      
      var data = {
        widgetId: options.id,
        path: options.path,
        options: options.serverOptions
      };

      //TODO: refactor socket.io/ajax calls into common code path
      if (feather.appOptions.useAjaxForSystem) {
        $.ajax({
          url: "/_ajax/",
          type: "post",
          dataType: "json",
          contentType: "application/json",
          data: JSON.stringify({
            action: "loadwidget",
            sid: feather.sid,
            data: data
          }),
          success: loadWidgetCallback,
          statusCode: {
            406: function(response) {
              //mismatching session IDs...
              feather.socket.sysBus.fire("noSessionFound");
            }
          }
        });
      } else {
        //use the sysChannel for this operation (requires socket connection to be ready)
        feather.socket.stateMachine.onceState("ready", function() {
          var messageId = feather.id();
          //setup the reply handler
          //TODO: change this to use channels
          feather.socket.sysBus.once("loadwidget:" + messageId, loadWidgetCallback);

          //fire off the message
          data.messageId = messageId;
          feather.socket.sysBus.fire("loadwidget", data);
        });
      }      
    }
  };  
})();
