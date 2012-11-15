var io = require("socket.io"), 
  util = require("util"),
  _ = require("underscore")._,
  EventPublisher = require("./event-publisher"),
  Widget = require("./widget"),
  cache = require("./simple-cache"),
  channels = require("./channels"),
  fs = require('fs'),
  Connect = require('connect');

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
                 
      logger.warn({
        message: "socket server listening on port " + options["port"],
        category: "feather.socket"
      });
      
      //create the socket.io wrapper
      var socketServer = io.listen(httpServer.httpServer, options['socket.io']);      

      //setup authorization event to fetch session object and stash on client during subsequent connection event (rather than doing it every request)
      socketServer.set('authorization', function(handshakeData, _cb) {

        //require cookies
        if (!handshakeData.headers.cookie) {
          return _cb('Cookies are required.', false);
        }

        var cookies = Connect.utils.parseCookie(handshakeData.headers.cookie);
        cookies = Connect.utils.parseSignedCookies(cookies, options.connect.cookieParser.secret);
        handshakeData.sessionId = cookies[options.connect.session.key];

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
          //build "request" object to not break downstream APIs (legacy support)
          message.request = {session: client.session, sessionId: client.session.id};

          handleMessage(client, message, function() {
            if (message.request && message.request.session) {
              // Re-store the session in case they modified it.
              httpServer.sessionStore.set(client.session.id, client.session);
            }
          }); 
        });
      });

      cb(null, socketServer);
    }
  });
};
