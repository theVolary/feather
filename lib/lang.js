jojo.ns("jojo.lang");

//lightweight universal object cache for all jojo objects
jojo.lang.objects = {};

Function.prototype.bind = function(obj, args, appendArgs){
    var method = this;
    return function() {
        var callArgs = args || arguments;
        if (appendArgs === true){
            callArgs = Array.prototype.slice.call(arguments, 0);
            callArgs = callArgs.concat(args);
        }else if (typeof appendArgs == "number"){
            callArgs = Array.prototype.slice.call(arguments, 0); // copy arguments first
            var applyArgs = [appendArgs, 0].concat(args); // create method call params
            Array.prototype.splice.apply(callArgs, applyArgs); // splice them in
        }
        return method.apply(obj || window, callArgs);
    };
};
Function.prototype.argumentNames = function() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\((.*?)\)/)[1].split(",");//.invoke("strip");
    var _names = [];
    if (names && names.length) {
        for (var i = 0; i < names.length; i++) {
            _names[i] = names[i].replace(/^\s+/, '').replace(/\s+$/, '');
        }
        return _names;
    }
    return [];
};
Function.prototype.wrap = function(wrapper) {
    var __method = this;
    return function() {
      return wrapper.apply(this, [__method.bind(this)].concat($A(arguments)));
    };
};
Array.prototype.each = function(iterator) {
    try {
        for (var i = 0; i < this.length; i++) {
            iterator(this[i], i);
        }
    } catch (e) {
        if (e !== $break) {
            throw e;
        }
    }
};
Array.prototype.find = function(iterator) {
    for (var i = 0; i < this.length; i++) {
        if (iterator(this[i], i)) {
            return this[i];
        }
    }
};
Array.prototype.reject = function(iterator) {
    var results = [];
    this.each(function(value, index) {
        if (!iterator(value, index))
            results.push(value);
    });
    return results;
};
Array.prototype.any = function(iterator) {
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator(value, index))
        throw $break;
    });
    return result;
};
Array.prototype.pluck = function(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
};
Array.prototype.first = function() {
    if (this.length > 0) {
        return this[0];
    }
    return null;
};

Object.extend = function(o, c, defaults){
    // no "this" reference for friendly out of scope calls
    if(defaults){
        Object.extend(o, defaults);
    }
    if(o && c && typeof c == 'object'){
        for(var p in c){
            o[p] = c[p];
        }
    }
    return o;
};

var _global = jojo.isOnServer ? global : window;

_global.$A = function(iterable) {
  if (!iterable) return [];
  if (iterable.toArray) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
};

// adapted from Prototype
/* Based on Alex Arnell's inheritance implementation. */
_global.Class = {
  create: function() {
    var parent = null, properties = $A(arguments);
    if (typeof properties[0] == "function")
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, _global.Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      var subclass = function() { };
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0; i < properties.length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = jojo.emptyFn;

    klass.prototype.constructor = klass;

    return klass;
  }
};

_global.Class.Methods = {
  addMethods: function(source) {
    var ancestor   = this.superclass && this.superclass.prototype;
    var properties = Object.keys(source);

    if (!Object.keys({ toString: true }).length)
      properties.push("toString", "valueOf");

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && (typeof value == "function") &&
          value.argumentNames().first() == "$super") {
        var method = value, value = Object.extend((function(m) {
          return function() { return ancestor[m].apply(this, arguments); };
        })(property).wrap(method), {
          valueOf:  function() { return method; },
          toString: function() { return method.toString(); }
        });
      }
      this.prototype[property] = value;
    }

    return this;
  }
};

_global.$H = function(obj) {
    var keys;
    var ret = {
        get: function(key) {
            return obj[key];
        },
        each: function(iterator) {
            for (var key in obj) {
                var value = obj[key], pair = [key, value];
                pair.key = key;
                pair.value = value;
                iterator(pair);
            }
        },
        find: function(iterator) {
            for (var key in obj) {
                var value = obj[key], pair = [key, value];
                pair.key = key;
                pair.value = value;
                if (iterator(pair)) {
                    return pair;
                }
            }
        },
        keys: function() {
            if (keys) {
                return keys;
            }
            keys = [];
            for (var key in obj) {
                keys.push(key);
            }
            return keys;
        }
    };
    return ret;
};

Object.keys = function(obj) {
    return $H(obj).keys();
};

_global.$ = function(el) {
    //just a dumb alias for now
    return document.getElementById(el);
};

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
 * NOTE: this class is only capitalized because "interface" is a reserved js keyword and causes problems in certain environments
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