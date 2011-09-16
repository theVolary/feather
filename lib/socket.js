var io = require("socket.io"), 
  http = require("http")
  https = require("https"), 
  util = require("util"),
  _ = require("underscore")._,
  channels = require("./channels"),
  EventPublisher = require("./event-publisher"),
  Widget = require("./widget"),
  cache = require("./simple-cache"),
  channels = require("./channels");

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

/**
 * Alias to {@link Channels.addChannel}
 * @function
 * @name Socket.addChannel
 */
var addChannel = socket.addChannel = channels.addChannel;

//TODO: migrate all these to a channel implementation
function doRpc(client, message, cb) {
  cache.getItemWait("feather-logger", function(err, logger) {
    if (err) throw err;

    var result = {
      messageId: message.id,
      type: "rpc",
      err: null,
      success: true
    };
    function send() {
      cb && cb();
      client.json.send(result);
    }
    function e(ex) {
      logger.error("RPC error: " + ex);
      result.err = ex;
      result.success = false;
      send();
    }
    if (!message || !message.id || !message.data) {
      e("All feather socket messages require an id and data property.");
    }
    var shortWidgetName = message.data.widgetPath.match(/[^\/]*\/$/)[0].replace("/", "");
    Widget.loadClass(message.data.widgetPath, shortWidgetName, function(err, widgetClass) {
      if (err) e(err); else {
        var instance = new (widgetClass.classDef)({
          request: message.request,
          client: client
        });
        message.data.params.push(function(err, ret) {
          if (err) e(err); else {
            if (typeof(ret) !== "undefined") {
              result.result = ret;
            }
          }
          instance.dispose();
          send();
        });
        instance[message.data.methodName].apply(instance, message.data.params);
      }
    }); 
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
  } else {
    //for now, just broadcast... routing is done on client via channelName
    //TODO: remove this once everything is running on a proper channels implementation
    client.broadcast({
      type: "event",
      eventName: message.data.eventName,
      eventArgs: message.data.eventArgs,
      busName: message.data.busName,
      messageId: message.id
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
        shimServer = https.createServer({
          key: fs.readFileSync(options.ssl.key),
          cert: fs.readFileSync(options.ssl.cert)
        }, function(req, res) {
          //TODO: anything needed here?
        });
      } else {
        shimServer = http.createServer(function(req, res) {
          //TODO: anything needed here?
        });
      }
      
      //start listening
      shimServer.listen(options.socketPort);

      logger.info({
        message: "feather socket server listening on port " + options.socketPort,
        category: "feather.ssock"
      });
      
      //create the socket.io wrapper
      var socketServer = io.listen(shimServer, options.socketOptions);
      socketServer.sockets.on('close', function(errno) {
        logger.info({message:"feather socket server shutting down.", category:'feather.srvr', immediately:true});
      });
      socketServer.sockets.on('connection', function(client) {
        client.on("disconnect", function() {
          //debugger;
        });
        client.on("message", function(message) {
          if (message.sid && httpServer.sessionStore) {
            httpServer.sessionStore.get(message.sid, function(err, sess) {
              if (err) logger.error('Error retrieving session: ' + err);
              else if (!sess) logger.error('Error retrieving session: not found'); 
              else {
                logger.trace({message:"Got session from store.  it is: " + util.inspect(sess), category:"feather.ssock"});
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
          } else {
            handleMessage(client, message);
          }
        });
      });

      cb(null, socketServer);
    }
  });
};
