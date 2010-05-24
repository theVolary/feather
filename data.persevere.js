jojo.ns("jojo.data.persevere");

(function() { 

    jojo.data.persevere.provider = Class.create(jojo.data.provider, {
		initialize: function($super, options) {
			$super(options);
			this.root = jojo.appOptions.data.provider.root; //must be specified somewhere before we get to this point (usually in the call to jojo.init())
			this.sendOptions = new Jaxer.XHR.SendOptions(); //cache the default send options to allow overriding per-request
			//set some xhr defaults
			this.sendOptions.cacheBuster = false;
			this.sendOptions.method = "GET";
			this.sendOptions.headers = {
				Accept: "application/javascript"
			};
		},
		makeRequest: function(options) {
			var me = this;
			options = options || {};
			options.url = options.path ? this.root + options.path : this.root;
			options = Object.extend(Object.clone(this.sendOptions), options);
			//wrap the onsuccess handler to auto-deserialize the json data
			var _onsuccess = options.onsuccess || jojo.emptyFn;
			options.onsuccess = function(response) {
				var obj = eval("(" + response + ")");
				_onsuccess(obj);
			};
			//special headers to allow xdomain access
			/*if (options.method != "GET") {
				options.headers["Access-Control-Request-Method"] = options.method;
			}*/
			Jaxer.XHR.send(options.body || "", options);
		},
		wrapClass: function($super, options) { //TODO: remove this if we truly just pass to the super class anyway
			return $super(options);
		},
		load: function(classPath, options) {
            throw new Error("A data services provider implementation has not been set yet.");
        },
        query: function(classPath, options) {
			var me = this;
			options.query = "/" + (options.query || jojo.emptyString);
			this.makeRequest({
				path: options.collection.wrappedClass.id + options.query,
				onsuccess: options.callback
			});
        },
        saveItem: function(classPath, options) {
			var me = this;
			this.makeRequest({
				path: options.instance.wrappedClass.id + "/" + (options.instance.data.id || ""),
				method: options.instance.isNew ? "POST" : "PUT",
				body: Object.toJSON(options.instance.data),
				onsuccess: options.callback
			});
        },
		bulkSave: function(classPath, options) {
			var me = this;
			var data = [];
			options.collection.each(function(instance) {
				//first attempt to put all the instances in the dormant state of "bulkOperation"
				instance.fire("bulkOperation");
				data.push(instance.data);
			});
			this.makeRequest({
				path: options.collection.wrappedClass.id + "/",
				method: "PUT", //Persevere will auto-create new items if no id is present
				body: Object.toJSON(data),
				onsuccess: options.callback
			});
		},
        deleteItem: function(classPath, options) {
            throw new Error("A data services provider implementation has not been set yet.");
        },
        loadRemoteClasses: function(wrappedClasses, unloadedPaths, options) {
            var me = this;
			var queryStr = "Class/[?";
			//special case...
			if (unloadedPaths.length == 1 && unloadedPaths[0] === "/") { //we're loading ALL classes
				queryStr = "Class/";
			} else {
				unloadedPaths.each(function(path) {
					queryStr += "id='Class/" + path + "'|";
				});
				queryStr = queryStr.replace(/\|$/, "") + "]";
			}
			this.makeRequest({
				path: queryStr,
				onsuccess: function(result) {
					if (result && result.length > 0) {
						result.each(function(schema) {
							options.schema = schema;
							var wrappedClass = me.wrapClass(options);
							wrappedClasses.push(wrappedClass);
						});
						if (options.callback) {
							options.callback(wrappedClasses);
						}
					}
				}
			});
        }
	});
	
	jojo.data.persevere.classWrapper = Class.create(jojo.data.classWrapper, {
		initialize: function($super, options) {
			$super(options);
		},
		wrapClass: function(options) { //called internally from the base class constructor
			var wrapper = this;
			//dynamically build the instance and collection classes bound to this wrapper
			wrapper.instance = Class.create(wrapper.instance, {
				initialize: function($super, instanceOptions) {
					instanceOptions = instanceOptions || {};
					this.wrappedClass = wrapper;
					$super(instanceOptions);
					if (this.isNew) {
						this.applyData(this.schema.prototype); //instance defaults from the server
					}
				},
				schema: options.schema
			});
			wrapper.collection = Class.create(wrapper.collection, {
				initialize: function($super, instanceOptions) {
					instanceOptions = instanceOptions || {};
					this.wrappedClass = wrapper;
					$super(instanceOptions);
				}
			});
		}
	});
	
	jojo.data.persevere.instance = Class.create(jojo.data.instance, {
		states: {
			initial: {
				loading: function(instance) {
					return instance.states.loading;
				},
				saving: function(instance) {
					return instance.states.saving;
				},
				bulkOperation: function(instance) {
					return instance.states.bulkOperation;
				},
				deleting: function(instance) {
					return instance.states.deleting;
				},
				editing: function(instance) {
					return instance.states.editing;
				}
			},
			loading: {
				stateStartup: function(instance, args) {
					jojo.data.load(instance.wrappedClass.id, args.eventArgs.options.id, args.eventArgs.options);
				},
				callback: function(instance, args) {
					if (args.success) {
						instance.applyData(args.result);
						instance.isNew = false;
						instance.loaded = true;
						instance.fire("load");
						return instance.previousState;
					} else {
						instance.fire("error", {message: args.message});
					}
				}
			},
			saving: {
				stateStartup: function(instance, args) {	
					jojo.data.saveItem(instance.wrappedClass.id, args.eventArgs.options);
				},
				callback: function(instance, args) {
					if (args.success) {
						instance.applyData(args.result);
						instance.isNew = false;
						instance.loaded = true;
						instance.fire("save");
						return instance.previousState;
					} else {
						instance.fire("error", {message: args.message});
					}
				}
			},
			bulkOperation: { // state that a collection or transactional container object can put instances in before bulk operations, thus preventing other operations until the bulk operation is complete
				bulkOperationComplete: jojo.fsm.gotoPreviousState
			},
			deleting: {
				stateStartup: function(instance, args) {
					jojo.data.deleteItem(instance.wrappedClass.id, instance.id, args.eventArgs.options);
				},
				callback: function(instance, args) {
					if (args.success) {
						instance.applyData(args.result);
						instance.isNew = true; //keep the object in-memory but revert to isNew status
						instance.loaded = false; //go back to "unloaded" status as well
						instance.fire("delete");
						return instance.previousState;
					} else {
						instance.fire("error", {message: args.message});
					}
				}
			},
			editing: {
				stateStartup: function(instance, args) {
					if (!instance.editor) {
						instance.editor = instance.getEditor(args.eventArgs.options);
						instance.editor.edit();
					}
				},
				saving: function(instance) {
					return instance.states.saving;
				},
				editComplete: function(instance, args) {
					if (instance.editor) {
						instance.editor.dispose();
					}
					delete instance.editor;
					return instance.states.initial;
				}
			},
			error: { //special state name (will auto-respond to all "error" events as if defined as a global state transition function)
				stateStartup: function(instance, args) {
					//TODO: what to do? alert user, log error?
					//when do we return to the initial state, if ever?
					//do we wrap a transactional model, track and revert changes on error?
					jojo.alert(args.eventArgs.message);
				}
			}
		},
		initialize: function($super, options) {
			this.data = {};
			$super(options);
        },        
        applyData: function(data) {
			if (data) {
				Object.extend(this.data, data);
			}
        },     
        /**
         * This method is used to load an object using a specified method on the server. The "load" event will be fired on completion of the call.
         * @param {String} id   The id of the object to load.
         */
        load: function(options) {
			var me = this;
			options = options || {};
			var callback = options.callback || jojo.emptyFn;
			options.callback = function(args) {
				me.fire("callback", args);
				callback(args);
			};
			this.fire("loading", {options: options}); //let the FSM control this
        },
        /**
         * This method is used to save an object to the server. The "save" event will be fired on completion of the call.
         */
        save: function(options) {
            var me = this;
			options = jojo.data.ensureOptions(options);
			options.instance = this;
            //perform server save
            var callback = options.callback || jojo.emptyFn;
			options.callback = function(result) {
				me.fire("callback", {success: true, result: result});
				callback(result);
			};
			this.fire("saving", {options: options}); //let the FSM control this
        },
		deleteItem: function(options) {
			var me = this;
			options = options || {};
            //perform server save
            var callback = options.callback || jojo.emptyFn;
			options.callback = function(args) {
				me.fire("callback", args);
				callback(args);
			};
			this.fire("deleting", {options: options}); //let the FSM control this
		},
		getEditor: function(options) {
			options.instance = this;
			var editor = jojo.data.persevere.getEditor(this.wrappedClass.id);
			if (editor) {
				var editor = new (editor.editor)(options);
				if (!Jaxer.isOnServer) {
					editor.fire("ready");
				}
				return editor;
			}
			//if there is no default editor registered, throw an error
			throw new Error("No default editor for this class or system wide default editor has been defined.");
		}
	});
	
	jojo.data.persevere.collection = Class.create(jojo.data.collection, {
		states: {
			initial: {
				loading: function(collection) {
					return collection.states.loading;
				},
				saving: function(collection) {
					return collection.states.saving;
				},
				editingInstance: function(collection) {
					return collection.states.editingInstance;
				}
			},
			loading: {
				stateStartup: function(collection, args) {
					jojo.data.query(collection.wrappedClass.id, args.eventArgs.options);
				},
				callback: function(collection, args) {
					if (args.success) {
						//always store the result first
						//this can also be used to track dirty objects for batch operations
						collection.unwrappedItems = args.result;                
						if (collection.loaded) {
							collection.suppress("itemRemoved");
							collection.removeAll(); //clear any items in the collection
							collection.unSuppress("itemRemoved");
						}
						/**
						 * TODO: figure out how to deal with paging in Persevere (I think it has to do with a custom paging header)
						 */
						/*collection.totalRecordCount = args.resultObj.Result.TotalRecordCount || results.length;
						if (collection.getObject().pagination) {
							collection.totalPages = Math.ceil(collection.totalRecordCount / collection.getPageSize());
						}*/
						
						//loop the results and create and add wrapped instances
						collection.suppress("itemAdded");
						for (var i = 0; i < args.result.length; i++) {
							collection.add(new (collection.wrappedClass.instance)({
								id: collection.id + "_" + args.result[i].id, //for fast registry lookups
								data: args.result[i],
								loaded: true,
								isNew: false,
								on: {
									editing: function(editingArgs) {
										//put the collection in edit mode to prevent other operations while the instance is being edited
										collection.fire("editingInstance", {instance: editingArgs.sender});
									}
								}
							}));
						}
						collection.unSuppress("itemAdded");
						collection.loaded = true;
						collection.fire("load", {
							items: collection.items
						});
						return collection.states.initial;
					} else {
						collection.fire("error", {message: args.message});
					}
				}
			},
			saving: {
				stateStartup: function(collection, args) {
					//TODO: do dirty object detection and only send the necessary data
					var provider = jojo.data.defaultProvider; //this is a special case method - only available at this level
					provider.bulkSave(collection.wrappedClass.id, args.eventArgs.options);
				},
				callback: function(collection, args) {
					if (args.success) {
						//always store the result first
						//this can also be used to track dirty objects for batch operations
						collection.unwrappedItems = args.result; 
						
						//loop the results and make sure any new data sent back from the server is applied
						collection.suppress("itemAdded");	
						for (var i = 0; i < args.result.length; i++) {
							//TODO: figure out how to deal with new items (data.id won't be present on the instance in the collection)
							var instance = collection.findById(args.result[i].id); //objects should always come back with an id
							if (instance) {
								instance.applyData(args.result[i]);
								instance.loaded = true;
								instance.isNew = false;
								instance.fire("save");
								//put the instance back to the initial state
								instance.fire("bulkOperationComplete");
							}
						}
						collection.unSuppress("itemAdded");
						collection.loaded = true;
						collection.fire("save");
						return collection.states.initial;
					} else {
						collection.fire("error", {message: args.message});
					}
				}
			},
			editingInstance: {
				stateStartup: function(collection, args) {
					//TODO: maybe the collection does some other actions (i.e. UI notification or the like)?
					args.eventArgs.instance.once("editComplete", function() {
						collection.fire("editInstanceComplete");
					});
				},
				editInstanceComplete: jojo.fsm.gotoInitialState
			},
			error: { //special state name (will auto-respond to all "error" events as if defined as a global state transition function)
				stateStartup: function(collection, args) {
					//TODO: what to do? alert user, log error?
					//when do we return to the initial state, if ever?
					//do we wrap a transactional model, track and revert changes on error?
					jojo.alert(args.eventArgs.message);
				}
			}
		},
		initialize: function($super, options) {
			$super(options);
		},
		/**
		 * Override the registry's method in order to key by instance data.id and collection.id combined for fast lookups based on back end id
		 * (vs. client-side object auto-id)
		 * @param {Object} $super
		 * @param {Object} id
		 */
		findById: function($super, id) {
			return $super(this.id + "_" + id);
		},
		load: function(options) {
			var me = this;
			options = jojo.data.ensureOptions(options);
			options.collection = this;
			var callback = options.callback || jojo.emptyFn;
			options.callback = function(result) {
				me.fire("callback", {success: true, result: result});
				callback(result);
			};
			this.fire("loading", {options: options}); //let the FSM control this
		},
		save: function(options) {
			var me = this;
			options = jojo.data.ensureOptions(options);
			options.collection = this;
			var callback = options.callback || jojo.emptyFn;
			options.callback = function(result) {
				me.fire("callback", {success: true, result: result});
				callback(result);
			};
			this.fire("saving", {options: options}); //let the FSM control this
		}
	});
	
	/**
	 * set the default provider to be an instance of our specific implementation
	 */
	jojo.data.defaultProvider = new jojo.data.persevere.provider({
		classWrapper: jojo.data.persevere.classWrapper,
		instance: jojo.data.persevere.instance,
		collection: jojo.data.persevere.collection
	});
	
	/**
	 * Cache object and helper methods for registering and finding default editors for various classes
	 */
	jojo.data.persevere.editors = new jojo.lang.registry();
	jojo.data.persevere.registerEditor = function(options) {
		options = options || {};
		var editorObj = {
			id: options.className || "default",
			editor: options.editor
		};
		jojo.data.persevere.editors.add(editorObj);
	};
	jojo.data.persevere.getEditor = function(className) {
		var obj = jojo.data.persevere.editors.findById(className);
		if (obj) {
			return obj;
		}
		//if no specialized editor was found, fall back to the system wide default editor
		return jojo.data.persevere.editors.findById("default");
	};

})();