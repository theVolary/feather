exports.DataProvider = Class.create(feather.event.eventPublisher, {
  name: "Test",
  initialize: function($super, options) {
    $super(options);
    
    options = options || {};
    
    this.db = {
      
    };
  },
  getDb: function() {
    return this.db;
  }
});
