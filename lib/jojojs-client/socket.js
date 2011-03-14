(function() {
  
  jojo.ns("jojo.socket");
  
  /**
   * Registry to track pending messages and their callbacks
   */
  jojo.socket.pendingMessages = new jojo.lang.registry();
  
  /**
   * wrapper to key messages with a unique id on the way out in order to map a callback handler for replies
   * @param {Object} options
   *    {
   *      data: {your: "data", goes: "here"},
   *      callback: function() {}
   *    }
   */
  jojo.socket.send = function(options) {
    var message = {
      id: jojo.id(),
      data: options.data,
      rpc: options.rpc
    };
    jojo.socket.client.send(message);
    //if a callback is supplied, tack on the callback before storing in the registry
    if (typeof options.callback === "function") {
      message.callback = options.callback;
      jojo.socket.pendingMessages.add(message);
    }
  };
  
  var receive = function(result) {
    //find the message by id, and invoke the callback if present
    var message = jojo.socket.pendingMessages.findById(result.messageId);
    if (message && message.callback) {
      message.callback(result);
      //for now, clean up after 1 callback (use another mechanism for persistent comm channels)
      jojo.socket.pendingMessages.remove(message);
    }
  };
  
  /**
   * Once the framework is bootstrapped (and thus jojo.appOptions available),
   * make the socket connection and tell the main stateMachine when successful
   */
  jojo.stateMachine.onceState("ready", function() {
    jojo.socket.client = new io.Socket(null, {
      port: jojo.appOptions.socketPort,
      rememberTransport: false
    });
    jojo.socket.client.connect();
    jojo.socket.client.on("connect", function() {
      jojo.stateMachine.fire("socketReady");
    });
    jojo.socket.client.on('message', function(obj){
      receive(obj);
    });    
  });
})();
