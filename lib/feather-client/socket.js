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
            feather.socket.sysBus = feather.socket.addEventBus("feather.sys:" + feather.socket.client.sessionId);
            
            //put the fsm into ready state
            fsm.fire("ready");
          };
          feather.socket.callbacks.add(message);
        },
        ready: function(fsm, args) {
          return fsm.states.ready;
        }
      },
      ready: feather.fsm.emptyState
    }
  });

  /**
   * Registry to track pending callbacks by message id
   * @see Instance of {@link feather.lang.registry}
   */
  feather.socket.callbacks = new feather.lang.registry();
  
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
      if (typeof options.callback === "function") {
        message.callback = options.callback;
        feather.socket.callbacks.add(message);
      }
    });
  };
  
  var receive = function(result) {
    var message = feather.socket.callbacks.findById(result.messageId);
    if (message && message.callback) {
      message.callback(result);
      //clean up after 1 callback
      feather.socket.callbacks.remove(message);
    }
    if (result.type === "event") {
      //find the bus
      var bus = feather.socket.getEventBus(result.busName);
      if (bus) {
        bus.fire("broadcast:" + result.eventName, result.eventArgs);
      }
    } else if (result.type == "channel") {
      var channel = channels.findById(result.channelId);
      if (channel) {
        channel.fire(result.message, result.data);
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
  feather.socket.eventBus = Class.create(feather.event.eventPublisher, {
    fire: function($super, eventName, eventArgs, callback) {
      if (eventName.indexOf("broadcast:") > -1) {
        return $super(eventName, eventArgs);
      }
      
      feather.socket.send({
        type: "event",
        data: {
          eventName: eventName,
          eventArgs: eventArgs,
          busName: this.id
        },
        callback: callback
      });
    },
    on: function($super, eventName, handler) {
      return $super("broadcast:" + eventName, handler);
    }
  });
  
  /**
   * Registry to track persistent named event bus instances.  Instance of {@link feather.lang.registry}.
   */
  feather.socket.buses = new feather.lang.registry();
  
  /**
   * Helper function for creating event buses to register to
   * @param {String} busName
   */
  feather.socket.addEventBus = function(busName) {
    var bus = feather.socket.getEventBus(busName);
    if (bus) return bus;
    bus = new feather.socket.eventBus({
      id: "bus:" + busName
    });
    feather.socket.buses.add(bus);
    return bus;
  };
  
  /**
   * Helper function for registering listeners on an event bus
   * @param {String} busName
   */
  feather.socket.getEventBus = function(busName) {
    return feather.socket.buses.findById(busName);
  };
  
  var channels = new feather.lang.registry();
  
  var channelClass = Class.create(feather.event.eventPublisher, {
    send: function(message, data, toClients) {      
      feather.socket.send({
        type: "channel",
        data: {
          channelId: this.id,
          message: message,
          toClients: toClients,
          data: data
        }
      });
    },
    subscribe: function(data) {
      feather.socket.send({
        type: "channel",
        data: {
          channelId: this.id,
          message: "subscribe",
          data: data
        }
      });
    },
    unsubscribe: function() {
      feather.socket.send({
        type: "channel",
        data: {
          channelId: this.id,
          message: "unsubscribe",
        }
      });
    },
    joinGroup: function(groupName) {
      feather.socket.send({
        type: "channel",
        data: {
          channelId: this.id,
          message: "group:" + groupName + ":"
        }
      });
    },
    sendGroup: function(groupName, message, data) {
      feather.socket.send({
        type: "channel",
        data: {
          channelId: this.id,
          message: "group:" + groupName + ":" + message,
          data: data
        }
      });
    },
    leaveGroup: function(groupName) {
      feather.socket.send({
        type: "channel",
        data: {
          channelId: this.id,
          message: "group:" + groupName + "::"
        }
      });
    },
    dispose: function($super) {
      this.unsubscribe();
      channels.remove(this);
      $super();
    }
  });
  
  feather.socket.subscribe = function(options) {
    var channel = channels.findById(options.id);
    if (!channel) {
      channel = new channelClass(options);
      channels.add(channel);
    }
    channel.subscribe(options.data);
    return channel;
  };
})();
