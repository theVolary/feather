jojo.ns("jojo.widget");

(function() {
	
	/**
	 * This is the public interface to return for the jojo.widget class definition.
	 * The base class is jojo.fsm.FiniteStateMachine, therefore all widgets must
	 * be instantiated with at least an 'initial' state definition.	 
	 */
	jojo.widget = Class.create(jojo.fsm.finiteStateMachine, {
		/**
		 * Constructor 
		 * @param {Object} $super The base class constructor (automatically wired)
	 	 * @param {Object} options The configuration options for the instance
		 */
		initialize: function($super, options) {
			options = options || {};
			options.states = options.states || jojo.widget.defaultStates;
			$super(options);
						
			//subclass options
			this.container = options.container;
			this.myid = options.myid; //the shortened version of the auto prefixed long id (note: this can be a collision with other widgets so don't rely on it too much; its main use is to auto-attach an instance property for children)
			
			//children/parent relationships
			if (options.parent) {
				options.parent.children = options.parent.children || new jojo.lang.registry();
				options.parent.children.add(this);
				options.parent[this.myid] = this;
				this.parent = options.parent;
			}
		},
		/**
		 * shortcut method for getting dom elements keyed by instance id
		 * @param {Object} id
		 */
		$: function(id) {
			return $(this.id + "_" + id);
		},
		render: function(options) {
			this.fire("render", options); // behavior implemented via FSM controller		
		},
		dispose: function($super) {
			if (this.domEvents) {
				this.domEvents.dispose();
			}
			$super();
		}
	});	
	
	/**
	 * A registry to cache already loaded classes to prevent duplicate loads.
	 * This registry will enforce unique ids and will fire events when items are added (allow other code to listen and take action if needed)
	 */
	jojo.widget.loadedClasses = new jojo.lang.registry(true, true);
	
	/**
	 * A registry to cache all widget instances to enforce unique ids as well as
	 * allow other code to listen and take action as needed.
	 */
	jojo.widget.widgets = new jojo.lang.registry(true, true);
	
	/**
	 * Helper factory method for creating widget subclass definitions.
	 * This will allow other code to be injected into the class loading pipeline as needed,
	 * as well as handle common concerns for FSM and templating setup.
	 * @param {Object} options
	 */
	jojo.widget.create = function(options) {
		var classObj = jojo.widget.loadedClasses.findById(options.path);
		if (!classObj) {
			classObj = {
				id: options.path,
				name: options.name
			};
			options.prototype.widgetPath = options.path;
			options.prototype.widgetName = options.name;
			//fire an event that will allow outside code to have a say in how the class gets contructed,
			//for example: to decorate the prototype object as needed			
			jojo.widget.widgets.fire("beforeWidgetClassCreation", {
				options: options
			});
			var classDef = Class.create(jojo.widget, options.prototype);
			classObj.classDef = classDef;
			jojo.widget.loadedClasses.add(classObj);			
		}
		return classObj.classDef;
	};
	
})();
