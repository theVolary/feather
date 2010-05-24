(function() {
   
    jojo.data = new jojo.event.eventPublisher(); //enable firing events
    
	jojo.data.defaultContext = jojo.appOptions.data.provider.defaultContext || window;
    
    /**
     * interface definition for high level data services functionality
     */
    jojo.data.provider = Class.create({
		initialize: function(options) {
			options = options || {};
			this.classWrapper = options.classWrapper; //this is a Class constructor
			this.instance = options.instance || jojo.data.instance; //this is a Class constructor
			this.collection = options.collection || jojo.data.collection; //this is a Class constructor
			if (!this.classWrapper) {
				throw new Error("All jojo.data.provider instances must be passed a jojo.data.classWrapper Class (not instance).");
			}
			if (!this.instance) {
				throw new Error("All jojo.data.provider instances must be passed a jojo.data.instance Class (not instance).");
			}
			if (!this.collection) {
				throw new Error("All jojo.data.provider instances must be passed a jojo.data.collection Class (not instance).");
			}
		},
		wrapClass: function(options) {
			options = options || {};
			options.instance = options.instance || this.instance;
			options.collection = options.collection || this.collection;
			return new (this.classWrapper)(options);
		},
		load: function(className /*String*/, options /*Function*/) {
            throw new Error("A data services provider implementation has not been set yet.");
        },
        query: function(className /*String*/, options /*Function*/) {
            throw new Error("A data services provider implementation has not been set yet.");
        },
        saveItem: function(className /*String*/, options /*Function*/) {
            throw new Error("A data services provider implementation has not been set yet.");
        },
        deleteItem: function(className /*String*/, options /*Function*/) {
            throw new Error("A data services provider implementation has not been set yet.");
        },
        loadClasses: function(paths, options) {
			var me = this;
			options = options || {};
			if (typeof paths === "string") {
				paths = [paths];
			}
			var wrappedClasses = [];
			var unloadedPaths = [];
			paths.each(function(path) {
				var wrappedClass = jojo.data.classes.findById(path);
				if (wrappedClass) {
					wrappedClasses.push(wrappedClass);
				} else {
					unloadedPaths.push(path);
				}
			});
			if (unloadedPaths.length > 0) {
				me.loadRemoteClasses(wrappedClasses, unloadedPaths, options);
			} else if (options.callback) {
				options.callback(wrappedClasses);
			}
		},
		loadRemoteClasses: function(wrappedClasses, unloadedPaths, options) {
			throw new Error("A data services provider implementation has not been set yet.");
		}
	});
	
	/**
	 * registry to cache class definitions by fully qualified id
	 */
	jojo.data.classes = new jojo.lang.registry(true, true, "The jojo.data.classes registry requires that all registered classes be uniquely named.") // an indexed registry of wrapped instance and collection classes, whose constructors should take json-deserialized objects (or arrays) from the server and create nicely abstracted instances.
    //expose a registry level method for creating a context object for all loaded classes (not entirely sure what a good use case is, but have a hunch it could come in handy somewhere)
    jojo.data.classes.extendContext = function(_context) {
        jojo.data.classes.each(function(_item) {
            _item.extendContext(_context);
        });
    };
	
	jojo.data.classWrapper = Class.create({
		initialize: function(options) {
			options = options || {};
			this.id = options.classId || options.id || options.schema.id;
			if (!this.id || jojo.data.classes.findById(this.id)) {
				throw new Error("All jojo.data.classWrapper instances must have a unique id.");
			}
			var context = options.context || jojo.data.defaultContext || window;
			this.className = options.className || this.id;
			this.instance = options.instance; //this is a Class constructor
			this.collection = options.collection; //this is a Class constructor
			this.wrapClass(options);
	        this.extendContext(context);	
			jojo.data.classes.add(this);
			//fire a global event for each class loaded
            jojo.data.fire("classLoaded", {wrappedClass: this});
            //fire another global event keyed to this specific classname (allows introspective lookahead listening if needed)
            jojo.data.fire(this.className + "_classLoaded", {wrappedClass: this});
		},
		wrapClass: function() {
			throw new Error("jojo.data.classWrapper.wrapClass() must be overridden.");
		},
		extendContext: function(_context) {
            jojo.ns(this.className, _context);
            if (!_context[this.className + "Extended"]) {
                _context[this.className] = this;
                _context[this.className + "Extended"] = true;
            }
        }
	});
	
	jojo.data.instance = Class.create(jojo.fsm.finiteStateMachine, {
		loaded: false,
		isNew: true,
		initialize: function($super, options) {
			$super(options);
			if (!this.wrappedClass) {
				throw new Error("All jojo.data.instance instances must be contained by a jojo.data.wrappedClass and have that be passed in via the .wrappedClass property in the options.");
			}
			//allow initializing values in the constructor (with preloaded data from the server, for example, which will most likely be true when creating collections via a query)
            if (options.data) {
                this.applyData(options.data);
            }
			if (options.isNew !== undefined) {
				this.isNew = options.isNew;
			}
			if (options.loaded !== undefined) {
				this.loaded = options.loaded;
			}
		},
		applyData: function(data) {
			throw new Error("jojo.data.instance.applyData() must be overridden.");
		},
		edit: function(options) {
			this.fire("editing", {options: options}); //let the FSM handle the details
			if (this.editor) {
				return this.editor;
			}
			return null;
		}
	});
	
	//create a mashup class of jojo.lang.registry and jojo.fsm.finiteStateMachine to use as our collection class
	jojo.data.fsmRegistry = Class.create(jojo.fsm.finiteStateMachine, {
		initialize: function($super, options) {
			$super(options);
			jojo.lang.registry.prototype.initialize.call(this, true, false);			
			this.fireEvents = true;
		}
	});
	for (var p in jojo.lang.registry.prototype) {
		if (jojo.lang.registry.prototype.hasOwnProperty(p) && p !== "initialize") {
			jojo.data.fsmRegistry.prototype[p] = jojo.lang.registry.prototype[p];
		}
	}
	
	jojo.data.collection = Class.create(jojo.data.fsmRegistry, {
		loaded: false,
		initialize: function($super, options) {
			$super(options);
			if (!this.wrappedClass) {
				throw new Error("All jojo.data.collection instances must be contained by a jojo.data.wrappedClass and have that be passed in via the .wrappedClass property in the options.");
			}
		}
	});
	
	/**
	 * set the default provider to be an instance of our "semi-abstract" base class/stub
	 */
	jojo.data.defaultProvider = new jojo.data.provider({
		classWrapper: jojo.data.classWrapper,
		instance: jojo.data.instance,
		collection: jojo.data.collection
	});
	
	function ensureProvider(provider) {
        if (!provider) {
            provider = jojo.data.defaultProvider;
        }
        return provider;
    }
    
    function ensureClass(classId) {
        if (!jojo.data.classes.findById(classId)) {
            throw new Error("The class '" + classId + "' has not been loaded yet. You must use jojo.data.loadClasses() to load the client class before attempting to get instances from the server.");
        }
    }
	
	function ensureOptions(options) {
		options = options || {};
		if (typeof options === "function") { // allow passing just a callback function for simple cases
			options = {
				callback: options
			};
		}
		return options;
	}
    
    Object.extend(jojo.data, {
		ensureProvider: ensureProvider,
		ensureClass: ensureClass,
		ensureOptions: ensureOptions,
        load: function(classId /*String*/, id /*String*/, callback /*Function*/, provider /*jojo.data.IDataServicesProvider, {optional}*/, options /*Object, {optional}*/) {
            provider = ensureProvider(provider);
            ensureClass(classId);
            //fire a global "before load" event
            jojo.data.fire("beforeItemLoad", {classId: classId, id: id, provider: provider, options: options});
            //NOTE: the provider should allow a callback function as the 3rd param, and should pass the resulting data item as the sole argument to that callback
            provider.load(classId, id, function(item) {
                //fire a global event to indicate an item was loaded
                jojo.data.fire("itemLoaded", {classId: classId, item: item});
                //fire another global event keyed to this specific items's id (allow listeners for specific objects by classname and id)
                jojo.data.fire(classId + "_itemLoaded#" + item.id, {item: item});
                //execute the callback if it exists
                if (callback && typeof callback == "function") {
                    callback(item);
                } else if (callback) {
                    throw new Error("The callback object passed to jojo.data.load() was not a function.");
                }
            }, options);
        },
        
        query: function(classId /*String*/, options /*Object, {optional}*/) {
            options = ensureOptions(options);
            options.provider = ensureProvider(options.provider);
			
            ensureClass(classId);
			
            //fire a global "before query" event
            jojo.data.fire("beforeQuery", {classId: classId, options: options});
			
			options.provider.query(classId, options);
        },
        
        saveItem: function(classId /*String*/, options /*Object, {optional}*/) {
            options = ensureOptions(options);
            options.provider = ensureProvider(options.provider);
			
            ensureClass(classId);
			
            //fire global "before save" event
            jojo.data.fire("beforeSave", {classId: classId, options: options});
            
			options.provider.saveItem(classId, options);
        },
        
        deleteItem: function(classId /*String*/, id /*String*/, callback /*Function*/, provider /*jojo.data.IDataServicesProvider, {optional}*/, options /*Object, {optional}*/) {
            provider = ensureProvider(provider);
            ensureClass(classId);
            //fire a global "before delete" event
            jojo.data.fire("beforeDelete", {classId: classId, id: id, provider: provider, options: options});
            provider.deleteItem(classId, id, function(result) {
                //fire a global event
                jojo.data.fire("itemDeleted", {classId: classId, id: id});
                //fire another global event keyed to this specific items's id (allow listeners for specific objects by classname and id)
                jojo.data.fire(classId + "_itemDeleted#" + id);
                //execute the callback if it exists
                if (callback && typeof callback == "function") {
                    callback(result);
                } else if (callback) {
                    throw new Error("The callback object passed to jojo.data.deleteItem() was not a function.");
                }
            }, options);
        },
        
        loadClasses: function(paths /*String || Array*/, options /*Object, {optional}*/) {
            if (typeof paths == "string") {
                paths = [paths];
            }
            if (paths.constructor != Array || paths.length == 0) {
                throw new Error("The paths parameter passed into jojo.data.loadClasses() was not a string or an array of strings.");
            }
			
            options = ensureOptions(options);
            options.provider = ensureProvider(options.provider);
			
            //fire a global "before classes loaded" event
            jojo.data.fire("beforeClassesLoaded", {paths: paths, options: options});
            
            //NOTE: if any of the requested classes have already been loaded, the underlying provider should still return those wrapped classes
            //in the results array. The provider should handle whether or not to make redundant calls to the server in those cases, of course.
            //In most cases redundant calls should probably be expressly avoided by the underlying providers, with a possible override 
            //mechanism to force re-fetching (in case of an in-flight schema change or something, perhaps)
            options.provider.loadClasses(paths, options);
        }
	});
	
})();