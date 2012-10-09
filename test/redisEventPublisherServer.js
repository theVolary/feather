var RedisEventPublisher = require('../lib/event-publisher-redis'),
  console = require('console');

console.log('starting test server');

var publisher = new RedisEventPublisher({
  id: 'test',
  onceState: {
    ready: function() {
      publisher.fire('distributedReady');
    }
  }
});

publisher.on('event1', function() {
  console.log('event1 received');
  //ack
  publisher.fire('event1_ack', 'received');
});


//because I don't know a better way to keep the process living...
// var http = require('http');

// http.createServer(function (request, response) {
//   response.writeHead(200, {'Content-Type': 'text/plain'});
//   response.end('Hello World\n');
// }).listen(8124);