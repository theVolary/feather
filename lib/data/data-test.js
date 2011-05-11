exports.DataProvider = Class.create(feather.event.eventPublisher, {
  name: "Test",
  initialize: function($super, options) {
    $super(options);
    
    options = options || {};
    
    this.db = {
      view: function() {}
    };
  },
  getDb: function() {
    return this.db;
  }
});
