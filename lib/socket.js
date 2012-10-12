var io = require("socket.io"), 
  http = require("http")
  https = require("https"), 
  util = require("util"),
  _ = require("underscore")._,
  EventPublisher = require("./event-publisher"),
  Widget = require("./widget"),
  cache = require("./simple-cache"),
  channels = require("./channels"),
  fs = require('fs');

/**
 * @namespace The main socket object, which will also be used to route 
 * secure system messages to and from clients and the server (automatically keyed by client id).
 * @name Socket
 */

/*
 * The main socket object, which will also be used to route 
 * secure system messages to and from clients and the server (automatically keyed by client id).
 */
var socket = module.exports = new EventPublisher();

//wrap addChannel to pass in the socketServer instance
socket.addChannel = channels.addChannel;
socket.getChannel = channels.getChannel;

//TODO: migrate all these to a channel implementation
function doRpc(client, message, cb) {
  Widget.doRpc(message.request, client, message.data, function(err, _result) {
    cb && cb();
    var result = {
      messageId: message.id,
      type: "rpc",
      err: err,
      success: err ? false : true,
      result: _result
    };
    client.json.send(result);
  });
}

function doEvent(client, message, cb) {
  //secure the global busChannel to this client 
  //(in other words, this conversation is just between the server and this client)
  if (message.data.busName === "bus:feather.sys:" + client.id) {
    //this is a system message, route to appropriate handler...
    socket.fire(message.data.eventName, {
      client: client,
      message: message,
      result: {
        type: "event",
        eventName: message.data.eventName,
        eventArgs: null,
        busName: message.data.busName
      }
    });
  } 
}

function doChannel(client, message, cb) {
  var channel = channels.getChannel(message.data.channelId);
  if (channel) {
    channel.handleMessage(client, message.data, cb);
  } else {
    //TODO: error condition; log and handle
  }
}

function handleMessage(client, message, cb) {
  switch (message.type) {
    case "rpc":
      doRpc(client, message, cb);
      break;
    case "event":
      doEvent(client, message, cb);
      break;
    case "channel":
      doChannel(client, message, cb);
      break;
    case "sessionId":
      client.json.send({
        messageId: message.id,
        sessionId: client.id
      });
      break;
  }
}

/**
 * Initializes the module.
 * @param {Object} options
 * @param {Function} cb called upon completion.  The callback is passed an error and the socket server instance (if no errors occurred).
 * @memberOf Socket
 */
var init = socket.init = function(options, cb) {
  cache.getItemsWait([
    "feather-logger",
    "feather-server"
  ], function(err, cacheItems) {
    if (err) cb(err); else {
      var logger = cacheItems["feather-logger"],
        httpServer = cacheItems["feather-server"];
                 
      //create a shim http server instance
      var shimServer;
      if (options.ssl && options.ssl.enabled) {
        var tlsOptions = {
          key: fs.readFileSync(options.ssl.key),
          cert: fs.readFileSync(options.ssl.cert)
        };
        if (options.ssl.ca) {
          tlsOptions.ca = [];
          _.each(options.ssl.ca, function(ca) {
            var certs = fs.readFileSync(ca);
            tlsOptions.ca.push(certs);
          });
        }
        shimServer = https.createServer(tlsOptions, function(req, res) {
          //TODO: anything needed here?
        });
      } else { // Non-SSL
        shimServer = http.createServer(function(req, res) {
          //TODO: anything needed here?
        });
      }
      
      //start listening
      shimServer.listen(options["socket.io"].port);

      logger.warn({
        message: "feather socket server listening on port " + options["socket.io"].port,
        category: "feather.socket"
      });

      if (options.cluster || options['socket.io'].useRedis) {
        //cannot use memory store when clustering... use redis store (baked into socket.io modules - requires a running REDIS server)
        //TODO: enable configuration of REDIS server location/port on the createClient() calls below...
        var redis = require("socket.io/node_modules/redis"),
          RedisStore = require('socket.io/lib/stores/redis'),
          pub    = redis.createClient(),
          sub    = redis.createClient(),
          client = redis.createClient();

        options["socket.io"].store = new RedisStore({
          redisPub : pub,
          redisSub : sub,
          redisClient : client
        });

        //use RedisChannels
        redisChannels = require('./channels-redis');
        //make RedisChannel the default channel constructor for any channels added later
        channels.setChannelConstructor(redisChannels.RedisChannel);
        //now upgrade any channels that may have been added already
        channels.channels.each(function(channel) {
          redisChannels.upgrade(channel);
        });

      }
      
      //create the socket.io wrapper
      var socketServer = io.listen(shimServer, options['socket.io']);      

      //wire up events
      socketServer.sockets.on('close', function(errno) {
        logger.warn({message:"feather socket server shutting down.", category:'feather.socket', immediately:true});
      });
      socketServer.sockets.on('connection', function(client) {
        client.on("disconnect", function() {
          //debugger;
        });
        client.on("message", function(message) {
          if (message.sid && httpServer.sessionStore) {
            httpServer.sessionStore.get(message.sid, function(err, sess) {
              //need to send something back to the client if there's errors so it doesn't just not respond
              if (err) {
                logger.error('Error retrieving session: ' + err);
              } else if (!sess) {
                socket.fire("noSessionFound", {
                  client: client,
                  message: message,
                  result: {
                    type: "event",
                    eventName: "noSessionFound",
                    eventArgs: null,
                    busName: message.data.busName
                  }
                });
              } else {
                sess.id = message.sid; //for some reason the id isn't being returned anymore (not sure why), so we have to set it
                logger.trace({message:"Got session from store. ID: " + util.inspect(sess), category: "feather.socket"});
                message.request = {session: sess, sessionId: message.sid};
                client.session = sess;
                handleMessage(client, message, function() {
                  if (message.request && message.request.session) {
                    // Re-store the session in case they modified it.
                    httpServer.sessionStore.set(message.sid, message.request.session);
                  }
                }); 
              }       
            });
          } else if (message.sid && !httpServer.sessionStore) {
            socket.fire("noSessionFound", {
              client: client,
              message: message,
              result: {
                type: "event",
                eventName: "noSessionFound",
                eventArgs: null,
                busName: message.data.busName
              }
            });
          } else {
            handleMessage(client, message); 
          }
        });
      });

      cb(null, socketServer);
    }
  });
};
