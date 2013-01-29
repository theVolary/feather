
exports.init = function(feather) {
  var channel1 = feather.socket.addChannel({id: "channel1"});

  var channel2 = feather.socket.addChannel({
    id: "channel2",
    bouncing: true
  });

  var channel3 = feather.socket.addChannel({
    id: "channel3",
    announceConnections: false,
    messages: ["test", "ack"]
  });

  var channel4 = feather.socket.addChannel({
    id: "channel4",
    bouncing: true,
    messages: ["test", "ack"]
  });

  var channel5 = feather.socket.addChannel({
    id: "channel5",
    allowDirectMessaging: true,
    messages: ["test", "ack", "ack2"]
  });

  var channel6 = feather.socket.addChannel({
    id: "channel6",
    allowDirectMessaging: true,
    hooks: {
      subscribe: function(args, cb) {
        if (args.data.allowSubscribe) {
          cb();
        } else {
          cb('not allowed');
        }
      },
      connect: function(args, cb) {
        if (args.data.allowConnect) {
          cb();
        } else {
          cb('not allowed');
        }
      },
      disconnect: function(args, cb) {
        cb(null, 'disconnected');
      },
      message: function(args, cb) {
        switch (args.message) {
          case "allowMessage":
            cb(null, args.data + ": augmented");
            break;
          case "disallowMessage":
            cb('not allowed');
            break;
          case "directMessage":
            if (args.data === "allow") {
              cb(null, args.data);
            } else if (args.data === "alterList") {
              //change toClients to send directly to self
              var clientId = channel6.clientUUIDs[args.client.id];
              cb(null, args.data + ": to self", [clientId]);
            } else {
              cb("direct message not allowed");
            }
            break;
          default:
            cb(null, args.data);
            break;
        }
      },
      invalidMessage: function(args, cb) {
        
      }
    }
  });

  var channel7 = feather.socket.addChannel({
    id: "channel7",
    allowDirectMessaging: true,
    hooks: {
      subscribe: function(args, _cb) {
        var sessionId = args.client.session.id;

        process.nextTick(function() {
          channel7.sendBySessionId(sessionId, 'bySessionId', 'foo');
        });

        _cb();
      }
    }
  });

  var channel8 = feather.socket.addChannel({
    id: "channel8",
    allowDirectMessaging: true,
    hooks: {
      message: function(args, _cb) {
        if (args.message == "") {
          var sessionId = args.client.session.id;
          process.nextTick(function() {
            channel8.sendBySessionId(sessionId, 'shouldBe3', 'hello');
          });
        } else {
          _cb();
        }
      }
    }
  });
};