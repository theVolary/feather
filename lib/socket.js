var io = require("socket.io"), 
  util = require("util"),
  _ = require("underscore")._,
  EventPublisher = require("./event-publisher"),
  Widget = require("./widget"),
  cache = require("./simple-cache"),
  channels = require("./channels"),
  fs = require('fs'),
  Connect = require('connect'),
  cookie = require('cookie'),
  Promise = require('./promise').Promise,
  featherUtil = require('./util');

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
function doRpc(client, message, promise) {
  Widget.doRpc(message.request, client, message.data, function(err, _result) {
    
    var result = {
      messageId: message.id,
      type: "rpc",
      err: err,
      success: err ? false : true,
      result: _result
    };
    client.json.send(result);

    promise.resolve();
  });
}

function doEvent(client, message, promise) {
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

  promise.resolve();
}

function doChannel(client, message, promise) {
  var channel = channels.getChannel(message.data.channelId);
  if (channel) {
    channel.handleMessage(client, message.data, promise);
  } else {
    promise.resolve();
  }
}

function handleMessage(client, message, promise) {
  switch (message.type) {
    case "rpc":
      doRpc(client, message, promise);
      break;
    case "event":
      doEvent(client, message, promise);
      break;
    case "channel":
      doChannel(client, message, promise);
      break;
    case "sessionId":
      client.json.send({
        messageId: message.id,
        sessionId: client.id
      });
      promise.resolve();
      break;
  }
}

/**
 * Initializes the module.
 * @param {Object} options
 * @param {Function} cb called upon completion.  The callback is passed an error and the socket server instance (if no errors occurred).
 * @memberOf Socket
 */
var init = socket.init = function(options, cb, mirror) {
  cache.getItemsWait([
    "feather-logger",
    "feather-server"
  ], function(err, cacheItems) {
    if (err) cb(err); else {
      var logger = cacheItems["feather-logger"],
        httpServer = cacheItems["feather-server"];
                 
      logger.warn({
        message: "socket server listening on port " + options["port"],
        category: "feather.socket"
      });
      
      //upgrade to REDIS if configuration dictates
      if (options.cluster || options['socket.io'].useRedis) {
        //cannot use memory store when clustering... use redis store (baked into socket.io modules - requires a running REDIS server)
        var redis = require("socket.io/node_modules/redis"), //for compatibility safety reasons, use the version of node-redis that ships with socket.io here
          RedisStore = require('socket.io/lib/stores/redis'),
          pub = redis.createClient(
            options._config('redis.servers.socket.io.pub.port'),
            options._config('redis.servers.socket.io.pub.host'),
            options._config('redis.servers.socket.io.pub.options')
          ),
          sub = redis.createClient(
            options._config('redis.servers.socket.io.sub.port'),
            options._config('redis.servers.socket.io.sub.host'),
            options._config('redis.servers.socket.io.sub.options')
          ),
          client = redis.createClient(
            options._config('redis.servers.socket.io.client.port'),
            options._config('redis.servers.socket.io.client.host'),
            options._config('redis.servers.socket.io.client.options')
          );

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
      var socketServers = [io.listen(httpServer.httpServer, options['socket.io'])];     

      if (mirror) {
        socketServers.push(io.listen(mirror.httpServer, options['socket.io']));
      } 

      _.each(socketServers, function(socketServer, index) {

        //setup authorization event to fetch session object and stash on client during subsequent connection event (rather than doing it every request)
        socketServer.set('authorization', function(handshakeData, _cb) {

          //require cookies
          if (!handshakeData.headers.cookie) {
            return _cb('Cookies are required.', false);
          }

          var cookies = cookie.parse(handshakeData.headers.cookie);
          cookies = Connect.utils.parseSignedCookies(cookies, options.connect.session.secret),
          sessionIdCookie = cookies[options.connect.session.key];
          console.log("Socket handshake session id is " + sessionIdCookie);
          handshakeData.sessionId = sessionIdCookie;

          httpServer.sessionStore.get(handshakeData.sessionId, function(err, sess) {
            if (err) {
              logger.error('Error retrieving session: ' + err);
              return _cb('Error retrieving session', false);
            } else if (!sess) {
              logger.error('No session found for session id: ' + handshakeData.sessionId);
              return _cb('No session found', false);
            }

            //found session - stuff it into handshakeData for connection event to then move it up to client object
            sess.id = handshakeData.sessionId; //for some reason the id isn't being returned anymore (not sure why), so we have to set it

            handshakeData.session = sess;
            _cb(null, true);
          });          
        });

        //wire up events
        socketServer.sockets.on('close', function(errno) {
          logger.warn({message:"feather socket server shutting down.", category:'feather.socket', immediately:true});
        });
        socketServer.sockets.on('connection', function(client) {
          //store session at client level to not break downstream APIs (legacy support)
          client.session = client.handshake.session;

          client.on("message", function(message) {

            //TODO: re-evaulate this (putting in per-message session fetching again because we ran into stale sessions without it)
            var sessionId = client.session.id;
            httpServer.sessionStore.get(client.session.id, function(err, session) {
              client.session = session;
              client.session.id = sessionId;

              //build "request" object to not break downstream APIs (legacy support)
              message.request = {session: client.session, sessionId: client.session.id};

              //create a promise to pass down the handler layers
              var promise = new Promise();
              var resolve = function() {
                if (client.session) {
                  // Re-store the session in case they modified it.
                  httpServer.sessionStore.set(client.session.id, client.session);
                }
              };

              //store session whether the promise is resolved or rejected
              promise.then(resolve, resolve);

              handleMessage(client, message, promise); 
            });          
          });
        });
      })
      

      cb(null, socketServers);
    }
  });
};
