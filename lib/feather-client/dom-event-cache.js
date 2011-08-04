(function() {
  
  /**
   * @class DomEventCache allows a local caching policy for DOM event handlers
   */
  var DomEventCache = feather.DomEventCache = function() {
    this.observers = [];
  };

  DomEventCache.prototype = {
    /**
     * Attaches an event handler to a DOM element
     * @param {Object} element  Element on which to observe event
     * @param {String} name Event name
     * @param {Function/Object} observer    Function to call when event is triggered
     * @returns {Object} Details on the observer
     */
    bind: function(element, name, observer) {
      if (typeof observer != "function") {
        if (!observer.id || !observer.fn) {
          throw new Error("If the observer object is not a function, it must have both an 'id' (string) and 'fn' (function) property.");
        }
        if (_.any(this.observers, function(o) {
          return o.id && o.id == observer.id;
        })) {
          throw new Error("Cannot register two DOM event observer objects with the same id.");
        }
      }
      var me = this;
      var observerObject = {
        element:    $(element),
        name:        name,
        observer:    observer,
        unbind: function() {
          me.unbind(observerObject);
        }
      };
      this.observers.push(observerObject);
      observerObject.element.bind(name, observer.fn || observer);
      return observerObject;
    },
    
    /**
     * Detach an event handler from a DOM element
     * @param {Object} observerObject
     */
    unbind: function(observerObject) {
      if (_.find(this.observers, function(obs) {
          return obs === observerObject;
        })) {
                
        try { 
          observerObject.element.unbind(observerObject.name, observerObject.observer.fn || observerObject.observer); 
        } catch(ex) {
            
        }
        if (this.observers) {
          this.observers = _.reject(this.observers, function(obs) {
            return obs === observerObject;
          });
        }
        for (var p in observerObject) {
          observerObject[p] = null;
        }               
        observerObject = null; 
      }
    },
    
    /**
     * Detach an event handler from a DOM element, using an ID
     * @param {String} id   ID reference to observer details
     */
    unbindById: function(id) {
      var observer = _.find(this.observers, function(o) {
        return o.id && o.id == id;
      });
      if (observer) {
        this.unbind(observer);
      }
    },
    /**
     * Detach all event handlers
     */
    unbindAll: function() {
      var me = this;
      _.each(_.clone(this.observers), function(obs) {
        me.unbind(obs);
      });
    },    
    /**
     * Disposes of the cache by unbinding all and removing observers. 
     */
    dispose: function() {
      this.unbindAll();
      this.observers = null;
    }
  };

})();