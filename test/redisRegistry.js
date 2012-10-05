var RedisRegistry = require('../lib/registry-redis');

describe('RedisRegistry Tests', function() {

  //setup --------------------------------------
  beforeEach(function(done) {

    done();
  });

  //teardown --------------------------------------
  afterEach(function(done) {

    done();
  });


  it('should have 100 platform dubloons', function(done) {

    rise.api.walletTransaction.getBalance({
      currency: { type: 'platform', typeId: testData.platform._id, name: 'dubloons' },
      account: { type: 'user', typeId: testData.riseUser._id }
    }, function(err, result) {

      should.equal(200, result);
      done();
    })

  });

});