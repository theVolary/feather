(function() {
	
	/**
	 * Default widget FSM client states
	 */
	jojo.widget.defaultStates = {
		initial: {
			stateStartup: function(widget, args) {
				//do some general instance level setup stuff
				widget.domEvents = new jojo.event.domEventCache();
			},
			ready: function(widget, args) { //when my ready event is fired, move to the ready state
				return widget.states.ready;
			}
		},
		ready: {
			stateStartup: function(widget, args) {
				if (!widget.isReady && widget.onReady) {
					widget.onReady(args);
				}
				widget.isReady = true;
			},
			serverCall: function(widget, args) {
				return widget.states.serverCall;
			}
		},
		serverCall: {
			stateStartup: function(widget, args) {
				var options = args.eventArgs.options || {};
				options.callback = options.callback || jojo.emptyFn;
				var _callback = function(args) {
					widget.fire("serverCallComplete");
					options.callback(args);
				};
				options.widgetPath = options.widgetPath || widget.widgetPath;
				options.widgetName = options.widgetName || widget.widgetName;
				options.id = options.id || widget.id;
				serverCall.async(_callback, options);
			},
			serverCallComplete: jojo.fsm.gotoPreviousState
		}
	};
	
	/**
	 * Generic helper method to make calls back to the server
	 */
	jojo.widget.prototype.serverCall = function(options) {
		this.fire("serverCall", {options: options}); //let the FSM handle the details		
	};
	
})();
