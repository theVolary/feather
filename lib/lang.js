var sys = require("sys");
/**
 * Much of this file has been adapted from the Protoype.js library: www.protoypejs.org
 */

exports.init = function(appOptions) {
                sys.puts("lang.init");       

    var _global = global;
    
    jojo.ns("jojo.lang");
    
    //TODO: this really needs to be thought through to make sure proper disposal steps are taken for all objects
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
    _global.$break = {};
    Array.isArray = Array.isArray || $.isArray;
    Array.prototype.each = Array.prototype.forEach || function(iterator) {
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
    Array.prototype.findAll = function(iterator) {
        var ret = null;
        for (var i = 0; i < this.length; i++) {
            if (iterator(this[i], i)) {
                ret = ret || [];
                ret.push(this[i]);
            }
        }
        return ret;
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
    
    /**
     * The lowest level for all jojo objects (namely widgets, etc) (require unique id, etc.)
     * @param {Object} options
     */
    jojo.lang.baseClass = Class.create({
        initialize: function(options) {
            options = options || {};
            this.id = options.id || jojo.id();
            this.options = options;
            if (jojo.lang.objects[this.id]) {
                throw new Error("All jojo base objects must have a unique .id property specified. ID: '" + this.id + "'");
            }
            jojo.lang.objects[this.id] = this;
        },
        dispose: function() {
            delete jojo.lang.objects[this.id];
            for (var p in this) {
                delete this[p];
            }
        }
    });
    
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
        initialize: function($super, options) {  
            //naive catch-all for legacy calls
            if (arguments.length > 2) {
                throw new Error("jojo.lang.registry Class constructor has been changed to accept only a single 'options' JSON argument");
            }
                 
            $super(options);
            
            //public properties
            this.items = [];
            this.itemCache = {};

            options = options || {};
            if (options.unique === undefined || options.unique === null) {
                options.unique = true;
            }
            this.unique = options.unique;            
            this.uniqueErrorMessage = options.uniqueErrorMessage || "Error: All items in this registry instance must have unique IDs.";
            
            //decorate with event functionality if needed
            if (options.fireEvents === undefined || options.fireEvents === null) {
                options.fireEvents = true;
            }
            this.fireEvents = options.fireEvents;
            if (this.fireEvents) {
                var myid = this.id; //very important not to overwrite the id for outside code to grab the correct instance via the jojo.lang.objects cache
                Object.extend(this, new jojo.event.eventPublisher(options));
                this.id = myid;
            }
            this.idKey = options.idKey || "id";
        },
        /**
         * Add an item to the registry
         * @param {Object} item Item to be added
         * @param {Boolean} onlyAddIfNotAlreadyAdded    True to check if an item already exists with the current item ID - if one exists, method will return false
         * @param {Integer} stackIndex  Optional, where to insert the item into the stack/list of registry items
         * @return {Boolean}
         */
        add: function(item, onlyAddIfNotAlreadyAdded, stackIndex) {            
            if (item[this.idKey]) {
                if (onlyAddIfNotAlreadyAdded && this.findById(item[this.idKey])) {
                    return false;
                }
                if (this.unique && this.findById(item[this.idKey]) != null) {
                    throw new Error(this.uniqueErrorMessage + "\n\nid: " + item[this.idKey]);
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
                    this.itemCache[item[this.idKey]] = item;
                }
                
                if (this.fireEvents) {
                    this.fire("itemAdded", {item: item});
                }
            } else {
                throw new Error("Items in this registry must have '" + this.idKey + "' properties in order to be added.");
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
         * Finds all matching items in the registry
         * @param {Function} iterator   Function which returns true when the desired item is found
         * @return {Array} The matching items, or null if none found
         */
        findAll: function(iterator) {
            return this.items.findAll(iterator);
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
                if (this.items[i][this.idKey] == id) {
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
                delete this.itemCache[item[this.idKey]];
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
};