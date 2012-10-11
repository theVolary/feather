var RedisRegistry = require('../lib/registry-redis'),
  should = require('should');

var registry;

describe('RedisRegistry Tests', function() {

  //setup --------------------------------------
  beforeEach(function(done) {
    //create/dispose/create assures items are cleared out of redis from a previous failed test
    registry = new RedisRegistry({
      id: 'test'
    });
    registry.dispose(function() {
      registry = new RedisRegistry({
        id: 'test'
      });
      done();
    });
  });

  //teardown --------------------------------------
  afterEach(function(done) {
    registry.dispose(done);
  });


  it('should add an item', function(done) {

    var item1 = {id: "item1"};

    registry.add(item1, function(err) {

      should.not.exist(err);
      registry.length(function(err, len) {

        should.not.exist(err);
        len.should.equal(1);

        registry.findById(item1.id, function(err, item) {

          should.not.exist(err);
          item.should.eql(item1);
          done();
        });
      });
    });

  });

  it('should not allow duplicate items', function(done) {

    var item1 = {id: "item1"};
    var item2 = {id: "item1"};

    registry.add(item1, function(err) {

      should.not.exist(err);
      registry.add(item2, function(err) {

        should.exist(err);
        err.should.equal("All items in this registry instance must have unique IDs.... id: item1");
        done();
      });
    });

  });

  it('should add items from a range', function(done) {

    var items = [
      {id: "item1"},
      {id: "item2"}
    ];
    var more_items = [
      {id: "item3"},
      {id: "item4"}
    ];

    registry.addRange(items, function(err) {

      should.not.exist(err);
      registry.length(function(err, len) {

        should.not.exist(err);
        len.should.equal(2);
        
        registry.addRange(more_items, function(err) {

          should.not.exist(err);
          registry.length(function(err, len) {

            should.not.exist(err);
            len.should.equal(4);
            done();
          });
        });
      });
    });

  });

  it('should remove an item', function(done) {

    var item1 = {id: "item1"};
    registry.add(item1, function(err) {

      should.not.exist(err);
      registry.length(function(err, len) {

        should.not.exist(err);
        len.should.equal(1);

        registry.remove(item1, function(err, removed) {

          should.not.exist(err);
          removed.should.equal(true);

          registry.length(function(err, len) {

            should.not.exist(err);
            len.should.equal(0);
            done();
          });
        });
      });
    });
  });

  it('should add and find by custom idKey', function(done) {

    var item1 = {customId: 'item1'};
    registry.options.idKey = 'customId';

    registry.add(item1, function(err) {

      should.not.exist(err);
      registry.length(function(err, len) {

        should.not.exist(err);
        len.should.equal(1);

        registry.findById(item1.customId, function(err, item) {
          
          should.not.exist(err);
          item.should.eql(item1);
          done();
        });
      });
    });

  });

});