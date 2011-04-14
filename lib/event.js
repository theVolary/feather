var sys = require("sys"), 
  EventEmitter = require("node-core-enhancements/events/events").EventEmitter;

exports.init = function(appOptions) {
                sys.puts("event.init");  
  /**
   * Root namespace for custom event publishing/subscribing/dispatching services
   */
  feather.ns("feather.event");
   
  feather.event.eventPublisher = Class.create(feather.lang.baseClass, {
    /**
     * @constructor
     */
    initialize: function($super, config) {
      $super(config);
      
      var me = this;
      
      EventEmitter.apply(this); //get the base node EventEmitter functionality
      
      //allow wiring events via the constructor
      if (config && (config.on || config.once)) {
        if (config.on) {
          for (var evt in config.on) {
            me.on(evt, config.on[evt]);
          }
        }                
        if (config.once) {
          for (var evt2 in config.once) {
            me.once(evt2, config.once[evt2]);
          }
        }
      }
    },        
    //IDisposable
    dispose: function($super) {
        this.removeAllListeners();
        //TODO: what else does this class need to dispose of?
        $super();
    }
  });
  
  Object.extend(feather.event.eventPublisher.prototype, EventEmitter.prototype);

  /**
   * Global event dispatcher object for wide spread broadcasting and generic subscriptions.
   * This facilitates greater de-coupling where publishers and subscribers need not know about each other.
   */
  feather.event.eventDispatcher = new feather.event.eventPublisher();
  
  /**
   * turn the top level object into a pub/sub hub as well
   */
  var oldfeatherId = feather.id;
  Object.extend(feather, new feather.event.eventPublisher());
  feather.id = oldfeatherId;
};