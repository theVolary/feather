(function() {
	
	/**
	 * Registry to track loaded client files across page loads and callbacks,
	 * the goal here is to avoid emitting code more than once
	 */
	jojo.widget.clientFiles = new jojo.lang.registry(true, true);
	var sessionFiles = Jaxer.session["clientFiles"];
	if (sessionFiles) {
		jojo.widget.clientFiles.items = sessionFiles;
	}
	jojo.widget.clientFiles.on("itemAdded", function(args) {
		Jaxer.session["clientFiles"] = jojo.widget.clientFiles.items;
	});
	
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
						var glue = <>
							//{prototype.widgetName}.prototype.server = {prototype.widgetName}.prototype.server || {"{"}};
							{prototype.widgetName}.prototype.server_{p} = function(params, callback) {"{"}								
								this.serverCall({"{"}
									widgetName: "{prototype.widgetName}",
									widgetPath: "{prototype.widgetPath}",
									id: this.id,
									methodName: "{p}",
									params: (typeof params !== "function") ? params : [],
									callback: (typeof params === "function") ? params : callback
								});							
							};
						</>;
						clientScript += "\n" + glue.toString().replace(/\&lt;/g, "<").replace(/\&gt;/g, ">");
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
	jojo.widget.prototype.getClientScript = function(options) {
		var me = this; //this == the widget instance
		var clientScript = "";
		var clientScriptItem = jojo.widget.clientFiles.findById(me.clientFilePath);
		if (!clientScriptItem) {
			if (Jaxer.File.exists(me.clientFilePath)) {
				clientScript = Jaxer.File.read(me.clientFilePath);
								
				clientScriptItem = {
					id: me.clientFilePath
				};				
				jojo.widget.clientFiles.add(clientScriptItem);
			}
		}
		if (clientScriptItem) { //a client.js file exists and was loaded, so we need an instance creation script now
			var parentStr = me.parent ? "jojo.lang.objects['" + me.parent.id + "']" : "null";
			var instanceScript = <>
				jojo.stateMachine.onceState(jojo.stateMachine.states.ready, function(){"{"}
					var widget = new {me.widgetName}({"{"}
						id: '{me.id}',
						myid: '{me.myid}',
						parent: {parentStr}
					});
				});
			</>;
			clientScript += "\n" + instanceScript.toString().replace(/\&lt;/g, "<").replace(/\&gt;/g, ">");
		}
		return clientScript;
	};
	
	/**
	 * Server-only instance method for emitting client code that will be executed within the client instance's init event
	 * @param {Object} script
	 */
	jojo.widget.prototype.renderOnInitScript = function(script) {
		this.onInitScripts.push(script);
	};
		
	function fixEmptyNodes(parentNode) {
		var childNodes = parentNode.*;
		if (childNodes.length() > 0) {
			for (var i = 0; i < childNodes.length(); i++) {
				if (childNodes[i].*.length() == 0) {
					childNodes[i].appendChild(<> </>);
				} else {
					fixEmptyNodes(childNodes[i]);
				}
			}
		}
	}
		
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
				if (widget && widget.container && args && args.eventArgs) {
					var html = args.eventArgs.html; // collapse to local variable
					if (widget.getTemplate) {
						var template = widget.getTemplate(args.eventArgs);
						
						//there is an apparent bug in the DOM engine, where empty nodes will majorly screw up the rendering process
						//so, here we hunt for all empty nodes and simply add a single space text node to them (annoying bug indeed)
						fixEmptyNodes(template);						
						
						html = template.toString().replace(/\&lt;/g, "<").replace(/\&gt;/g, ">");
					}
					widget.container.dom.innerHTML = html || "";
					
					//render any client-side onInit scripts that were generated for this instance
					//before doing so, append a script to fire the ready event
					//NOTE: only do this if the widget has a client class defined
					var clientScriptItem = jojo.widget.clientFiles.findById(widget.clientFilePath);
					if (clientScriptItem) {
						widget.renderOnInitScript("this.fire('ready');");
						var onInitScript = <>
							jojo.stateMachine.onceState(jojo.stateMachine.states.ready, function(){"{"}
								var widget = jojo.lang.objects["{widget.id}"];
								widget.on("init", function() {"{"}
									{widget.onInitScripts.join("\n")}
								}.bind(widget), null, 0); //this codeblock should be the first init handler to execute
								widget.fire("init");
							});
						</>;
						var onInitStr = onInitScript.toString().replace(/\&lt;/g, "<").replace(/\&gt;/g, ">");
						Ext.DomHelper.append(document.body, {
							tag: "script",
							type: "text/javascript",
							html: onInitStr
						});
					}
					
					//now render any children widgets that just got embedded
					jojo.widget.render(widget.container.dom, widget.id + "_", widget);
				}
				//go back to whence we came
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
			var filePath = Jaxer.Web.resolve(path + widgetName + ".server.js", Jaxer.request.currentFolder);
			Jaxer.load(filePath, window, "server", true, false, false);
		}
	};
	
	/**
	 * Here we're recursively querying for the custom 'widget' tags starting at the document level and bootstrapping the
	 * rendering process.
	 */
	jojo.widget.render = function(node, idPrefix, parentWidget) {
		while (node !== null) {
			var widgets = Ext.query("widget:first", node);
			widgets && widgets.each(function(widget, index) {
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
				var el = Ext.get(widget);
				
				//find any declaratively defined options
				var optionTag = el.down("options", true);
				if (optionTag) {
					for (var i = 0; i < optionTag.attributes.length; i++) {
						options[optionTag.attributes[i].name] = optionTag.attributes[i].value;
					}
					if (optionTag.innerHTML.replace(/\s/g, "") != "") {
						options = Object.extend(options, eval("(" + optionTag.innerHTML + ")") || {});
					}
				}
				//create the instance
				var instance = new (widgetClass.classDef)(options);
				instance.clientFilePath = jojo.appOptions.root + path + widgetName + ".client.js";
				instance.clientFilePath = instance.clientFilePath.replace(/\//g, "\\");
				
				//now emit any client.js files and instance creation scripts needed
				//note: we want this script emitted before any children's script so that
				//instantiation on the client takes place in the right order
				if (instance.getClientScript) {
					var clientScript = instance.getClientScript();
					if (clientScript && clientScript !== "") {
						//finally, emit the collected client script
						Ext.DomHelper.append(document.body, {
							tag: "script",
							type: "text/javascript",
							html: clientScript
						});
					}
				}
					
				//recurse down the children tree first so rendering goes from the bottom up
				jojo.widget.render(widget, id + "_");
				
				//get the declaratively defined html for the widget if there is any
				var contentTemplate = el.down("contentTemplate", true);
				var html = contentTemplate ? contentTemplate.innerHTML : "";
				
				//remove the widget node from the current parent and replace with an appropriate container
				//TODO: move this into an instance method that can be overriden for custom container wrapping
				instance.container = Ext.get(Ext.DomHelper.insertBefore(widget, {
					tag: "div",
					id: id + "Container"
				}));
				el.remove(); //removes the actual "widget" tag now that a container div has been put in its place to hold any generated HTML				
				
				//let the instance handle its own rendering (usually via a FSM controller),
				//which could very likely lead into more recursions if more children are rendered dynamically
				instance.render({
					html: html
				});
				
				
			});
			widgets = Ext.query("widget:first", node);
			if (!widgets || widgets.length == 0) {
				node = null;
			}
		}		
	};
	
	/**
	 * kick off initial server page load render process ----------------------------------------------------
	 */
	if (Jaxer.isOnServer && !jojo.isCallback) {
		jojo.stateMachine.onState("ready", function() { //only do this once all the other framework initialization is complete
			jojo.widget.render(document, "");
		
			//move all script blocks (generated or otherwise) to a single block at the bottom of the document
			var scripts = Ext.query("script", document.body);
			var scriptStr = "";
			scripts && scripts.each(function(script) {
				scriptStr += "\n" + script.innerHTML + "\n";
				Ext.get(script).remove();
			});
			if (scriptStr !== "") {
				Ext.DomHelper.append(document.body, {
					tag: "script",
					type: "text/javascript",
					html: scriptStr
				});
			}
		});		
	}
	
})();