(function() {
  
  jojo.ns("jojo.socket");
  
  /**
   * Registry to track pending rpc messages and their callbacks
   */
  jojo.socket.rpcMessages = new jojo.lang.registry();
  
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
      type: options.type
    };
    jojo.socket.client.send(message);
    //if a callback is supplied, tack on the callback before storing in the registry
    if (message.type === "rpc" && typeof options.callback === "function") {
      message.callback = options.callback;
      jojo.socket.rpcMessages.add(message);
    }
  };
  
  var receive = function(result) {
    if (result.type === "rpc") {
      var message = jojo.socket.rpcMessages.findById(result.messageId);
      if (message && message.callback) {
        message.callback(result);
        //for now, clean up after 1 callback (use another mechanism for persistent comm channels)
        jojo.socket.rpcMessages.remove(message);
      }
    } else if (result.type === "event") {
      //find the channel
      var channel = jojo.socket.getChannel(result.channelName);
      if (channel) {
        channel.fire("broadcast:" + result.eventName, result.eventArgs);
      }
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
  
  /**
   * Specialized subclass of the eventPublisher API to add socket communication capabilities
   */
  jojo.socket.eventPublisher = Class.create(jojo.event.eventPublisher, {
    fire: function($super, eventName, eventArgs) {
      if (eventName.indexOf("broadcast:") > -1) {
        return $super(eventName, eventArgs);
      }
      jojo.socket.send({
        type: "event",
        data: {
          eventName: eventName,
          eventArgs: eventArgs,
          channelName: this.id
        }
      });
    },
    on: function($super, eventName, handler) {
      return $super("broadcast:" + eventName, handler);
    }
  });
  
  /**
   * Registry to track persistent named comm channels
   */
  jojo.socket.channels = new jojo.lang.registry();
  
  /**
   * Helper function for creating comm channels to register to
   */
  jojo.socket.addChannel = function(channelName) {
    var channel = new jojo.socket.eventPublisher({
      id: "channel:" + channelName
    });
    jojo.socket.channels.add(channel);
    return channel;
  };
  
  /**
   * Helper function for registering listeners on a comm channel
   */
  jojo.socket.getChannel = function(channelName) {
    return jojo.socket.channels.findById(channelName);
  };
})();
