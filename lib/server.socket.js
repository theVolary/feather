var io = require("socket.io"),
  http = require("http"),
  sys = require("sys");
  
//TOOD: make a socket-aware subclass of eventPublisher/fsm to enable 
//auto broadcast of events/state changes as well as allow outside subscribers to trigger the same
jojo.socket = new jojo.event.eventPublisher();

function doRpc(client, message) {
  var result = {
    messageId: message.id,
    type: "rpc",
    err: null,
    success: true
  };
  var clientParams = {
    client: client, 
    result: result, 
    message: message,
    autoResponse: true // TODO: Refactor this to sync: true
  };
  try {
    if (!message || !message.id || !message.data) {
      throw new Error("All jojo.socket messages require an id and data property.");
    }
    var shortWidgetName = message.data.widgetPath.match(/[^\/]*\/$/)[0].replace("/", "");
    var widgetClass = jojo.widget.loadClass(message.data.widgetPath, shortWidgetName);
    var instance = new (widgetClass.classDef)();
    
    message.data.params.unshift(clientParams);
    var ret = instance[message.data.methodName].apply(instance, message.data.params);
    instance.dispose();
    if (typeof(ret) !== "undefined") {
      result.result = ret;
    }
  } catch (ex) {
    result.err = ex;
    result.success = false;
  }
  if (clientParams.autoResponse) {
    client.send(result);
  }
}

function doEvent(client, message) {
  //for now, just broadcast... routing is done on client via channelName
  //TODO: add server-side routing via a jojo.socket.securePublisher concept
  client.broadcast({
    type: "event",
    eventName: message.data.eventName,
    eventArgs: message.data.eventArgs,
    channelName: message.data.channelName
  });
}

function doAuth(client, message) {
  var result = {
    type: "rpc",
    err: null,
    messageId: message.id,
    success: false,
    result: null // TODO: "result.result" seems redundant.  Refactor to "result.data"?
  };
  // TODO: make API calls on jojo.data.auth object and send the result to the client.
  if (jojo.data.auth) {
    jojo.data.auth[message.data.method].apply(jojo.data.auth, {
      username: message.data.username,
      password: message.data.password,
      client: client,
      result: result
    });
  } else {
    result.err = "Auth db not configured.";
    client.send(result);
  }
}

function handleMessage(client, message) {
  var doIt = null;
  switch(message.type) {
    case "rpc":
      doIt = doRpc;
      if (message.subtype == "auth") {
        doIt = doAuth;
      }
      break;
    case "event":
      doIt = doEvent;
      break;
    case "auth":
      doIt = doAuth;
      break;
    default:
      break;
  } // end switch
  doIt && doIt(client, message);
}

exports.init = function(options){
  //create a shim http server instance
  var server = http.createServer(function(req, res){
    //TODO: anything needed here?
  });
  
  //start listening
  server.listen(options.socketPort);
  jojo.logger.info({message:"Listening on port " + options.socketPort, category:"jojo.ssock"});
  
  //create the socket.io wrapper
  jojo.socket.server = io.listen(server);
  jojo.socket.server.on('connection', function(client){ 
    client.on("disconnect", function() {
      //debugger;
    });
    client.on("message", function(message) {
      jojo.logger.trace({message:"message is : " + sys.inspect(message), category:"jojo.ssock"});
      if (message.sid && jojo.server.sessionStore) {
        jojo.server.sessionStore.get(message.sid, function(err, sess) {
          if (!err) {
            jojo.logger.trace({message:"Got session from store.  it is: " + sys.inspect(sess), category:"jojo.ssock"});
            jojo.request = jojo.request || {};
            jojo.request.session = sess;
          } else {
            jojo.logger.error('Error retrieving session: ' + err);
          }
          
          handleMessage(client, message);
          
          if (jojo.request.session) {
            // Re-store the session in case they modified it.
            jojo.server.sessionStore.set(message.sid, jojo.request.session);
            delete jojo.request.session;
          }
        });
      } else {
        handleMessage(client, message);
      }
    });
  });
};