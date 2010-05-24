jojo.ns("jojo.lang");

//lightweight universal object cache for all jojo objects
jojo.lang.objects = {};

Object.extend(Object, {
	/**
     * Creates a deep-clone of an object
     * @param {Object} object   Object to clone
     * @return {Object} Cloned object
     */
    deepClone : function(object) {
       if (typeof object !== 'object' || object == null) {
           return object;
       }
       var c = object instanceof Array ? [] : {};
       for (var i in object) {
           var prop = object[i];
           if (typeof prop == 'object') {
              if (prop instanceof Array) {
                  c[i] = [];
                  for (var j = 0; j < prop.length; j++) {
                      if (typeof prop[j] != 'object') {
                          c[i].push(prop[j]);
                      } else {
                          c[i].push(Object.deepClone(prop[j]));
                      }
                  }
              } else {
                  c[i] = Object.deepClone(prop);
              }
           } else {
              c[i] = prop;
           }
       }
       return c;
    },
    /*
     * This method will extend out an object, including auto-extending sub-objects rather than overwriting them
     * @param {Object} dest The object receiving the properties
     * @param {Object} source   The object giving the properties
     * @return {Object} The merged destination object
     */
    merge: function(dest, source){
        for(var x in source){
            if(Object.isObject(source[x])){
                if(!dest[x]){ dest[x] = {}; }
                Object.merge(dest[x],source[x]);
            }else{
                dest[x] = source[x];
            }
        }
        return dest;
    }
});

/**
 * The lowest level for all jojo objects (namely widgets, etc) (require unique id, etc.)
 * @param {Object} options
 */
jojo.lang.baseClass = Class.create({
	initialize: function(options) {
		options = options || {};
		this.id = options.id || jojo.id();
		if (jojo.lang.objects[this.id]) {
			throw new Error("All jojo base objects must have a unique .id property specified. ID: '" + this.id + "'");
		}
		jojo.lang.objects[this.id] = this;
	},
	dispose: function() {
		delete jojo.lang.objects[this.id];
	}
});

/**
 * Provides basic design by contract services
 * NOTE: this class is only capitalized because "interface" is a reserved js keyword and causes problems in certain browsers
 */
jojo.lang.Interface = Class.create();
jojo.lang.Interface.prototype = {
	/**
	 * Creates a new Interface object with the given contract
	 * @constructor
	 * @memberOf {jojo.lang.Interface}
	 * @param {String} interfaceName The fully qualified name of this interface
	 * @param {Object} interfaceContract The object model contract that represents this interface
	 */
	initialize: function(interfaceName, interfaceContract) {
		// private variables
		var missingImplementationErrorMessage = "";
		
		this.getErrorMessage = function() {
		    return missingImplementationErrorMessage;
		};
		
		// Public instance methods		
		/**
		 * Method to check whether or not an object instance implements a particular contract (interface)
		 * @param {Object} implementingObject The object for which you want to check for the interface implementation
		 * @return {Boolean}
		 */
		this.Implements = function(implementingObject) {
			//very simple loop checking of properties and types, which could be expanded to be slightly more robust if needed
			//notice the not (!) operand to check the existence of the property, and then the type, if we encounter any failures, return false and exit the loop
			if (implementingObject === null || implementingObject === undefined)
			    return false;
			for (var prop in interfaceContract)
				if (!implementingObject.hasOwnProperty(prop) || 
				    (interfaceContract[prop] instanceof jojo.lang.Interface && !interfaceContract[prop].Implements(implementingObject[prop])) ||
					typeof implementingObject[prop] != typeof interfaceContract[prop]) {
					    missingImplementationErrorMessage = prop + " has not been implemented.";
					    if (interfaceContract[prop] instanceof jojo.lang.Interface) {
					        missingImplementationErrorMessage = prop + " is an inner interface and has not been implemented... inner error message: " + interfaceContract[prop].getErrorMessage();
					    }
					    return false;
				}
			//if the loop finished, return true
			return true;
		};
		
		/**
		 * This method will simply return the instance if it's a valid implementation of the interface, else throws an error
		 * @param {Object} implementingObject   The object for which you want to check for the interface implementation
		 * @param {String} objectName   The variable name of the object for the error message if it doesn't implement the interface
		 */
		this.Enforce = function(implementingObject, objectName) {
			if (this.Implements(implementingObject))
				return implementingObject;
			else
				throw new Error((objectName || "object ") + " does not implement interface " + interfaceName + ": " + missingImplementationErrorMessage);
		};
	}
};

/**
 * Class to handle collection registration/removal with optional events
 */
jojo.lang.registry = Class.create(jojo.lang.baseClass, {
	/**
	 * Creates a new Registry
	 * @constructor
	 * @param {Boolean} unique  True to require unique IDs for all items in the registry
	 * @param {Boolean} fireEvents  True to implement an event publisher
	 * @param {String} uniqueErrorMessage   Error message to throw when unique property is violated
	 */
	initialize: function($super, unique, fireEvents, uniqueErrorMessage) {		
		$super();
		
		//public properties
		this.items = [];
		this.itemCache = {};		
		if (unique === undefined || unique === null) {
			unique = true;
		}
		this.unique = unique;			
		this.uniqueErrorMessage = uniqueErrorMessage || "Error: All items in this registry instance must have unique IDs.";
		
		//decorate with event functionality if needed
		if (fireEvents === undefined || fireEvents === null) {
			fireEvents = true;
		}
		this.fireEvents = fireEvents;
		if (this.fireEvents) {
			var myid = this.id; //very important not to overwrite the id for outside code to grab the correct instance via the jojo.lang.objects cache
			Object.extend(this, new jojo.event.eventPublisher());
			this.id = myid;
		}
	},
	/**
	 * Add an item to the registry
	 * @param {Object} item Item to be added
	 * @param {Boolean} onlyAddIfNotAlreadyAdded    True to check if an item already exists with the current item ID - if one exists, method will return false
	 * @param {Integer} stackIndex  Optional, where to insert the item into the stack/list of registry items
	 * @return {Boolean}
	 */
	add: function(item, onlyAddIfNotAlreadyAdded, stackIndex) {			
		if (item.id) {
		    if (onlyAddIfNotAlreadyAdded && this.findById(item.id)) {
				return false;
			}
			if (this.unique && this.findById(item.id) != null) {
				throw new Error(this.uniqueErrorMessage + "\n\nid: " + item.id);
			}
		    
		    if (stackIndex != undefined && !isNaN(stackIndex)) {
				if (this.items.length == 0) {
					this.items.push(item);
				}
				else {
					var tmpItems = [];
					stackIndex = stackIndex < 0 ? 0 : (stackIndex > this.items.length - 1 ? this.items.length - 1 : stackIndex);
					this.each(function(h, index){
						if (index == stackIndex) {
							tmpItems.push(item);
						}
						tmpItems.push(h);
					});
					this.items = tmpItems;
				}
			}
			else {
				this.items.push(item);
			}
		        
			if (this.unique) {
				this.itemCache[item.id] = item;
			}
			
			if (this.fireEvents) {
				this.fire("itemAdded", {item: item});
			}
		} else {
			throw new Error("Items must have 'id' properties in order to be added to a registry.");
	    }
		return true;
	},
	/**
	 * Copy items from one collection based object (basically any object that supports .each enumeration)
	 * into this registry instance
	 */
	addRange: function(collection, onlyAddIfNotAlreadyAdded) {
	    var me = this;
        collection.each(function(item) {
            me.add(item, onlyAddIfNotAlreadyAdded);
        });
	},
	/**
	 * Add an item to the registry
	 * @param {Object} item Item to be added
	 * @param {Integer} stackIndex  Where to insert the item into the stack/list of registry items
	 * @param {Boolean} onlyAddIfNotAlreadyAdded    True to check if an item already exists with the current item ID -
	 *                                              if one exists, method will return false
	 */
	addAt: function(item, stackIndex, onlyAddIfNotAlreadyAdded) {
	    return this.add(item, onlyAddIfNotAlreadyAdded, stackIndex);
	},
	/**
	 * Finds an item in the registry
	 * @param {Function} iterator   Function which returns true when the desired item is found
	 * @return {Object} The item
	 */
	find: function(iterator) {
		return this.items.find(iterator);
	},	
	/**
	 * Finds an item in the registry by ID
	 * @param {String} id   ID of the registry item
	 * @return {Object} The item
	 */
	findById: function(id) {
	    if (this.unique) {
			return this.itemCache[id];
		}
	        
	    for(var i = 0; i < this.items.length; i++) {
		    if (this.items[i].id == id) {
				return this.items[i];
			}
	    }
	    return null;
	},	
	/**
	 * Removes an item from the registry by ID
	 * @param {String} id   ID of the registry item
	 * @return {Boolean}
	 */
	removeById: function(id) {
	    var item = this.findById(id);
	    return this.remove(item);
	},
	/**
	 * Removes an item from the registry
	 * @param {Object} item The registry item
	 * @return {Boolean}
	 */
	remove: function(item) {
	    if (!item) {
	        return false;
	    }
	    var foundItem = false;
		this.items = this.items.reject(function(it) { 
			if (it === item) {
				foundItem = true;
				return true; 
			}
			return false;
		});		
		if(this.unique) {
		    delete this.itemCache[item.id];
		}		    
		if (foundItem) {
			if (this.fireEvents) {
				this.fire("itemRemoved", {item: item});
			}
            if (this.items.length == 0 && this.fireEvents) {
				this.fire("cleared");
			}
            return true;
        }
        return false;
	},
	/**
	 * Removes all items from the registry
	 */
	removeAll: function() {
		var me = this;
		this.each(function(item) {
		    me.remove(item);
		});
	},
	/**
	 * Performs an action on each item in the registry
	 * @param {Function} iterator   Function containing code to execute on each item
	 */
	each: function(iterator) {
	    this.items.each(iterator);
	},
	dispose: function($super) {
		this.removeAll();
		$super();
	}
});

/**
 * Semaphore is a nice little async helper when multiple potential async paths need to complete before a common callback gets executed
 */
jojo.lang.semaphore = Class.create({
    initialize: function(callback, context) {
        this.semaphore = 0;
        this.callback = callback;
        this.context = context || this;
    },
    increment: function(amount) {
        if (amount === undefined) {
			amount = 1;
		}
		this.semaphore += amount;
    },
    decrement: function() {
        this.semaphore--;
    },
    execute: function() {
        if (this.semaphore == 0 && this.callback) {
            this.callback.apply(this.context, arguments); //this means that the args that actually reach the callback will be from the LAST async block to call .execute();
        }
    }
});