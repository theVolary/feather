var io = require("socket.io"),
  http = require("http"),
  sys = require("sys");
  
//TOOD: make a socket-aware subclass of eventPublisher/fsm to enable 
//auto broadcast of events/state changes as well as allow outside subscribers to trigger the same
jojo.socket = new jojo.event.eventPublisher();

exports.init = function(options){
  //create a shim http server instance
  var server = http.createServer(function(req, res){
    //TODO: anything needed here?
  });
  
  //start listening
  server.listen(options.socketPort);
  sys.puts("Listening on port " + options.socketPort);
  
  //create the socket.io wrapper
  jojo.socket.server = io.listen(server);
  jojo.socket.server.on('connection', function(client){    
    client.on("disconnect", function() {
      //debugger;
    });
    client.on("message", function(message) {
      var result = {
        messageId: null,
        err:null,
        success: true
      };
      
      // default to synchronous behavior.  The server method can internally set this to false 
      // and manage the client response asynchronously if necessary.
      client.manageResponse = true;
      try {
        if (!message || !message.id || !message.data) {
          throw new Error("All jojo.socket messages require an id and data property.");
        }
        result.messageId = message.id;
        if (message.rpc) {
          var shortWidgetName = message.data.widgetPath.match(/[^\/]*\/$/)[0].replace("/", "");
          var widgetClass = jojo.widget.loadClass(message.data.widgetPath, shortWidgetName);
          var instance = new (widgetClass.classDef)();
          message.data.params.unshift(result);
          message.data.params.unshift(client);
          var ret = instance[message.data.methodName].apply(instance, message.data.params);
          if (client.manageResponse) {
            result.result = ret;
          }
        }
      } catch (ex) {
        result.err = ex;
        result.success = false;
      }
      if (client.manageResponse) {
        client.send(result);
      }
    });
  });
};