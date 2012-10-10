var RedisEventPublisher = require('../lib/event-publisher-redis'),
  should = require('should'),
  fork = require('child_process').fork,
  path = require('path'),
  console = require('console');

var publisher;

//need the corresponding server running for this test
console.warn('the RedisEventPublisher tests require REDIS and the redisEventPublisherServer.js file to be running (just use node command on that file in another terminal before running this test).');

describe('RedisEventPublisher Tests', function() {

  //setup --------------------------------------
  beforeEach(function(done) {
    publisher = new RedisEventPublisher({
      id: 'test'
    });
    done();
  });

  //teardown --------------------------------------
  afterEach(function(done) {
    publisher.dispose();
    done();
  });

  it('should fire events across processes', function(done) {

    publisher.once('event1_ack', function(message) {
      message.should.equal('received');
      done();
    });
    publisher.fire('event1');
  });  

  it('should only receive local events once', function(done) {

    var num = 0;
    publisher.on('event2', function() {
      num++;
    });
    publisher.fire('event2');

    setTimeout(function() {
      num.should.equal(1);
      done();
    }, 1000);
  });  

});