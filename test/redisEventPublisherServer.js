var RedisEventPublisher = require('../lib/event-publisher-redis'),
  console = require('console');

console.log('starting test server');

var publisher = new RedisEventPublisher({
  id: 'test'
});

publisher.on('event1', function() {
  console.log('event1 received');
  //ack
  publisher.fire('event1_ack', 'received');
});


//because I don't know a better way to keep the process living other than an HTTP server
setTimeout(function() {
  console.log('shutting down...');
}, 60000);

console.log('this process will self destruct in 60 seconds (quick! run your test!)');