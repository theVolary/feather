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
            
            //dom management objects
            this.domEvents = new jojo.event.domEventCache();
                        
            //subclass options
            this.containerWrapper = options.containerWrapper;
            this.container = options.container;
            this.containerId = options.containerId;
            this.keepContainerOnDispose = options.keepContainerOnDispose;
            this.template = options.template;
            this.myid = options.myid; //the shortened version of the auto prefixed long id (note: this can be a collision with other widgets so don't rely on it too much; its main use is to auto-attach an instance property for children)
            this.windowOptions = options.windowOptions;
            
            //if (! options.container) {
            //  this.containerId = this.id + 'Container';
            //  this.container = $('#'+this.containerId)
            //}
            
            //children/parent relationships
            if (options.parent) {
                options.parent.children = options.parent.children || new jojo.lang.registry();
                options.parent.children.add(this);
                options.parent[this.myid] = this;
                this.parent = options.parent;
            }
            
            //add this instance to the widget registry
            jojo.widget.widgets.add(this);
        },
        /**
         * widget-scoped jQuery selector method
         */
        get: function(selector) {
            //fix id based selectors (if you are trying to do an absolute ID selector not scoped to this widget, just use $() instead of this.$())
            if (selector.indexOf("#") == 0) {
                selector = "#" + this.id + "_" + selector.substr(1);
            }
            var el = $(selector, this.container || null);
            return el;
        },
        render: function(options) {
            this.fire("render", options); // behavior implemented via FSM controller        
        },
        dispose: function($super) {
            jojo.widget.widgets.remove(this);
            if (this.domEvents) {
                this.domEvents.dispose();
            }
            //kill the children
            if (this.children && this.children.each) {
                this.children.each(function(child) {
                    try {
                        child && child.dispose && child.dispose();
                    } catch (ex) {}
                });
            }
            //remove UI elements
            if (this.container) {
                if (this.keepContainerOnDispose) {
                    this.container.html("");
                } else {
                    this.container.remove();
                }
            }
            this.fire("disposed");
            $super();
        }
    });
    
    /**
     * Default widget FSM client states
     */
    jojo.widget.defaultStates = {
        initial: {
            stateStartup: function(widget, args) {
                
            },
            render: function(widget, args) {        
                //move to the rendering state (if present)
                return widget.states.rendering;
            },
            ready: function(widget, args) {
                return widget.states.ready;
            }
        },
        ready: {//this state indicates rendering has completed, the widget's DOM is ready for manipulation (if the widget has a UI)
            stateStartup: function(widget, args) {
                if (!widget.isReady && widget.onReady) { //only execute the inline onReady method once
                    widget.fire("beforeReady", args);
                    widget.fire("inlineReady", args); //implementing this way to allow potential suppression or other scenarios                    
                }
                widget.isReady = true;
            },
            inlineReady: function(widget, args) {
                widget.onReady(args);
            }
        },
        rendering: {
            rendered: function(widget, args) {
                return widget.states.ready;
            }
        }
    };
    
    /**
     * A registry to cache already loaded classes to prevent duplicate loads.
     * This registry will enforce unique ids and will fire events when items are added (allow other code to listen and take action if needed)
     */
    jojo.widget.loadedClasses = new jojo.lang.registry();
    
    /**
     * A registry to cache all widget instances to allow other code to listen and take action as needed.
     */
    jojo.widget.widgets = new jojo.lang.registry();
    
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
            //fire an event that will allow outside code to have a say in how the class gets constructed,
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
