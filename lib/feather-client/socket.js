
(function() {
  /**
   * @namespace Container for all socket related logic
   * @name feather.socket
   */
  feather.ns("feather.socket");  
  
  /**
   * local fsm to track ready state of connection (allowing comms to queue locally via .onceState("ready"...)).
   * This is an instance of {@link FiniteStateMachine}.
   */
  feather.socket.stateMachine = new feather.FiniteStateMachine({
    states: {
      initial: {
        connected: function() {
          return this.states.connected;
        }
      },
      connected: {
        stateStartup: function() {
          var me = this;
          //still need to pull sessionId from the server
          var message = {
            id: feather.id(),
            type: "sessionId"
          };
          feather.socket.client.json.send(message);
          //use the rpc mechanisms to respond to the callback
          message.callback = function(args) {
            feather.socket.client.id = args.sessionId;
            // Add a global channel to route system calls on, keyed by client.sessionId for security
            feather.socket.sysBus = feather.socket.addEventBus("feather.sys:" + feather.socket.client.id);
            feather.socket.sysBus.on("noSessionFound", function() {
              feather.socket.stateMachine.fire("noSessionFound");
            });
            
            //put the fsm into ready state
            me.fire("ready");
          };
          feather.socket.callbacks.add(message);
        },
        ready: function() {
          return this.states.ready;
        }
      },
      ready: feather.FiniteStateMachine.emptyState
    }
  });

  /**
   * Registry to track pending callbacks by message id
   * @see Instance of {@link feather.Registry}
   */
  feather.socket.callbacks = new feather.Registry();
  
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
  feather.socket.send = function(options, forceSocketIO) {
    feather.stateMachine.onceState("ready", function() {
      if (!forceSocketIO && feather.appOptions.useAjaxForSystem) {
        //special case ajax actions
        if (options.type === "rpc") {
          $.ajax({
            url: "/_ajax/",
            type: "post",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify({
              action: "rpc",
              sid: feather.sid,
              data: options.data
            }),
            success: options.callback || feather.emptyFn,
            statusCode: {
              406: function(response) {
                //mismatching session IDs...
                feather.socket.stateMachine.fire("noSessionFound");
              }
            }
          });
        } else {
          feather.socket.send(options, true);
        }
      } else {
        if (!feather.appOptions["socket.io"].enabled) throw new Error("socket.io is not enabled");
        feather.socket.stateMachine.onceState("ready", function() {
          var message = {
            id: feather.id(),
            sid: feather.sid,
            data: options.data,
            type: options.type
          };
          feather.socket.client.json.send(message);
          //if a callback is supplied, tack on the callback before storing in the registry
          if (typeof options.callback === "function") {
            message.callback = options.callback;
            feather.socket.callbacks.add(message);
          }
        });
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
    if (typeof feather.sid === 'string') feather.sid = feather.sid.split('.')[0];

    if (feather.appOptions["socket.io"].enabled) {
      feather.socket.client = io.connect('/');
      
      feather.socket.client.on("connect", function() {
        feather.socket.stateMachine.fire("connected");
      });
      feather.socket.client.on('message', function(obj){
        receive(obj);
      });    
    }
  });
  
  /**
   * @class Specialized subclass of the eventPublisher API to add socket communication capabilities
   * @extends EventPublisher
   */
  var eventBus = feather.socket.eventBus = function() {
    eventBus._super.apply(this, arguments);
  };
  eventBus.prototype = {
    fire: function(eventName, eventArgs, callback) {
      if (eventName.indexOf("broadcast:") > -1) {
        return eventBus._super.prototype.fire.call(this, eventName, eventArgs);
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
    on: function(eventName, handler) {
      return eventBus._super.prototype.on.call(this, "broadcast:" + eventName, handler);
    }
  };
  inherits(eventBus, feather.EventPublisher);
  
  /**
   * Registry to track persistent named event bus instances.  Instance of {@link feather.Registry}.
   */
  feather.socket.buses = new feather.Registry();
  
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
  
  var channels = new feather.Registry();
  
  var channelClass = function(){
    channelClass._super.apply(this, arguments);
  };
  channelClass.prototype = {
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
          message: "unsubscribe"
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
    dispose: function() {
      this.unsubscribe();
      channels.remove(this);
      channelClass._super.prototype.dispose.apply(this, arguments);
    }
  };
  inherits(channelClass, feather.EventPublisher);
  
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
