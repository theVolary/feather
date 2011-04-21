(function() {
  /**
   * @namespace Container for all socket related logic
   * @name feather.socket
   */
  feather.ns("feather.socket");  
  
  /**
   * local fsm to track ready state of connection (allowing comms to queue locally via .onceState("ready"...)).
   * This is an instance of {@link feather.fsm.finiteStateMachine}.
   */
  feather.socket.stateMachine = new feather.fsm.finiteStateMachine({
    states: {
      initial: {
        connected: function(fsm, args) {
          return fsm.states.connected;
        }
      },
      connected: {
        stateStartup: function(fsm, args) {
          //still need to pull sessionId from the server
          var message = {
            id: feather.id(),
            type: "sessionId"
          };
          feather.socket.client.send(message);
          //use the rpc mechanisms to respond to the callback
          message.callback = function(args) {
            feather.socket.client.sessionId = args.sessionId;
            
            // Add a global channel to route system calls on, keyed by client.sessionId for security
            feather.socket.sysChannel = feather.socket.addChannel("feather.sys:" + feather.socket.client.sessionId);
            
            //put the fsm into ready state
            fsm.fire("ready");
          };
          feather.socket.rpcMessages.add(message);
        },
        ready: function(fsm, args) {
          return fsm.states.ready;
        }
      },
      ready: feather.fsm.emptyState
    }
  });

  /**
   * Registry to track pending rpc messages and their callbacks
   * @see Instance of {@link feather.lang.registry}
   */
  feather.socket.rpcMessages = new feather.lang.registry();
  
  /**
   * wrapper to key messages with a unique id on the way out in order to map a callback handler for replies.<br/>
   * Example options: <pre class="code">
   *    {
   *      data: {your: "data", goes: "here"},
   *      callback: function() {}
   *    }
   * </pre>
   * @param {Object} options
   */
  feather.socket.send = function(options) {
    feather.socket.stateMachine.onceState("ready", function() {
      var message = {
        id: feather.id(),
        sid: feather.sid,
        data: options.data,
        type: options.type
      };
      feather.socket.client.send(message);
      //if a callback is supplied, tack on the callback before storing in the registry
      if (message.type === "rpc" && typeof options.callback === "function") {
        message.callback = options.callback;
        feather.socket.rpcMessages.add(message);
      }
    });
  };
  
  var receive = function(result) {
    if (result.type === "rpc") {
      var message = feather.socket.rpcMessages.findById(result.messageId);
      if (message && message.callback) {
        message.callback(result);
        //for now, clean up after 1 callback (use another mechanism for persistent comm channels)
        feather.socket.rpcMessages.remove(message);
      }
    } else if (result.type === "event") {
      //find the channel
      var channel = feather.socket.getChannel(result.channelName);
      if (channel) {
        channel.fire("broadcast:" + result.eventName, result.eventArgs);
      }
    }
  };
  
  /*
   * Once the framework is bootstrapped (and thus feather.appOptions available),
   * make the socket connection and move the socket fsm into ready state
   */
  feather.stateMachine.onceState("ready", function() {
    feather.sid = $.cookie(feather.appOptions.sessionCookie);
    feather.socket.client = new io.Socket(null, {
      port: feather.appOptions.socketPort,
      rememberTransport: false
    });
    feather.socket.client.connect();
    feather.socket.client.on("connect", function() {
      feather.socket.stateMachine.fire("connected");
    });
    feather.socket.client.on('message', function(obj){
      receive(obj);
    });    
  });
  
  /**
   * @class Specialized subclass of the eventPublisher API to add socket communication capabilities
   * @extends feather.event.eventPublisher
   */
  feather.socket.eventPublisher = Class.create(feather.event.eventPublisher, {
    fire: function($super, eventName, eventArgs) {
      if (eventName.indexOf("broadcast:") > -1) {
        return $super(eventName, eventArgs);
      }
      feather.socket.send({
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
   * Registry to track persistent named comm channels.  Instance of {@link feather.lang.registry}.
   */
  feather.socket.channels = new feather.lang.registry();
  
  /**
   * Helper function for creating comm channels to register to
   * @param {String} channelName
   */
  feather.socket.addChannel = function(channelName) {
    var channel = feather.socket.getChannel(channelName);
    if (channel) return channel;
    channel = new feather.socket.eventPublisher({
      id: "channel:" + channelName
    });
    feather.socket.channels.add(channel);
    return channel;
  };
  
  /**
   * Helper function for registering listeners on a comm channel
   * @param {String} channelName
   */
  feather.socket.getChannel = function(channelName) {
    return feather.socket.channels.findById(channelName);
  };
})();
