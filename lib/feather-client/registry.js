(function() {
  
  /**
   * @class Registry is an iterable collection of objects keyed by an ID.  It internally stores
   * both an Array of items ordered by order added, as well as an associative array (Object) where
   * the items are indexed by the idKey of the Registry for fast lookups. Events are fired as items
   * are added or removed from the registry. The idKey is configurable, and defaults to 'id'. All items
   * added to a Registry must have a property whose key matches the idKey of the registry. All items
   * in the Registry must also have a unique idKey property value.
   * @param {Object} options
   * @param {Object} defaults
   * @extends EventPublisher
   */
  var Registry = feather.Registry = function(options, defaults) {
    Registry.super.call(this, options, _.extend({
      idKey: "id",
      uniqueErrorMessage: "All items in this registry instance must have unique IDs."
    }, defaults || {}));

    this.items = []; //iterable collection
    this.itemCache = {}; //indexed collection
  }

  Registry.prototype = {
    /**
     * Add an item to the registry
     * @param {Object} item Item to be added
     * @param {Integer} index  Optional, where to insert the item into the list of registry items
     * @return {Boolean}
     */
    add: function(item, index) { 
      var idKey = this.options.idKey,
        options = this.options;           
      if (item[idKey]) {
        if (typeof this.itemCache[item[idKey]] !== "undefined") {
          throw new Error(options.uniqueErrorMessage + " id: " + item[idKey]);
        }
        
        //add to iterable collection, with support for choosing where in the collection to add it
        if (index !== undefined && !isNaN(index)) {
          if (this.items.length == 0) {
            this.items.push(item);
          }
          else {
            var tmpItems = [];
            index = index < 0 ? 0 : (index > this.items.length - 1 ? this.items.length - 1 : index);
            this.each(function(h, _index){
              if (_index == index) {
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
        
        //add to indexed collection
        this.itemCache[item[idKey]] = item;

        this.fire("itemAdded", item);
      } else {
        throw new Error("Items in this registry must have '" + idKey + "' properties in order to be added. >>> keys: " + JSON.stringify(_.keys(item)));
      }
      return true;
    },
    
    /**
     * Copy items from one collection based object (basically any object that supports .each enumeration)
     * into this registry instance
     * @param {Array} collection
     */
    addRange: function(collection) {
      var me = this;
      _.each(collection, function(item) {
        me.add(item);
      });
    },
    
    /**
     * Finds an item in the registry
     * @param {Function} iterator   Function which returns true when the desired item is found
     * @returns {Object} The item
     */
    find: function(iterator) {
      return _.find(this.items, iterator);
    },
    
    /**
     * Finds all matching items in the registry
     * @param {Function} iterator   Function which returns true when the desired item is found
     * @returns {Array} The matching items, or null if none found
     */
    findAll: function(iterator) {
      return _.filter(this.items, iterator);
    },
    
    /**
     * Finds an item in the registry by ID
     *
     * NOTE: in its current form this is simply an alias for:
     *    var item = someRegistry.itemCache["foo"];
     *
     * Leaving it here to support legacy code, and also so we can potentially add more complex
     * indexing logic support at a later time.
     *
     * @param {String} id ID of the registry item
     * @returns {Object} The item found at the given index (undefined if none exist)
     */
    findById: function(id) {
      return this.itemCache[id];
    },
    
    /**
     * Removes an item from the registry by ID
     * @param {String} id   ID of the registry item
     * @returns {Boolean}
     */
    removeById: function(id) {
      var item = this.findById(id);
      return this.remove(item);
    },
    
    /**
     * Removes an item from the registry
     * @param {Object} item The registry item
     * @returns {Boolean}
     */
    remove: function(item) {
      if (!item) {
        return false;
      }
      var foundItem = false;
      this.items = _.reject(this.items, function(it) { 
        if (it === item) {
          foundItem = true;
          return true;
        }
        return false;
      });        
      delete this.itemCache[item[this.options.idKey]];
      if (foundItem) {
        this.fire("itemRemoved", item);
        if (this.items.length == 0) {
          this.fire("cleared");
        }
        return true;
      }
      return false;
    },
    
    /**
     * Removes all items from the registry, with events
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
      _.each(this.items, iterator);
    },
    
    /**
     * Disposes of this registry.
     * @param {Object} $super
     */
    dispose: function() {
      this.removeAll();
      Registry.super.prototype.dispose.apply(this, arguments);
    }
  };

  inherits(feather.Registry, feather.EventPublisher);

})();