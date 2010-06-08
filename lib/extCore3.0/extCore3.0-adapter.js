Function.prototype.bind = Function.prototype.createDelegate;

Function.prototype.argumentNames = function() {
	var names = this.toString().match(/^[\s\(]*function[^(]*\((.*?)\)/)[1].split(",");//.invoke("strip");
	var _names = [];
	if (names && names.length) {
		for (var i = 0; i < names.length; i++) {
			_names[i] = names[i].replace(/^\s+/, '').replace(/\s+$/, '');
		}
		return _names;
	}
	return [];
};

Function.prototype.wrap = function(wrapper) {
	var __method = this;
	return function() {
	  return wrapper.apply(this, [__method.bind(this)].concat($A(arguments)));
	};
};

Object.extend = Ext.apply;
Object.clone = function(obj) {
    return Object.extend({}, obj);
};
Object.toJSON = function(obj) {
    return Ext.encode(obj);
};
String.prototype.evalJSON = function() {
    return Ext.decode(this);
};
var $break = {}
Array.prototype.each = function(iterator) {
    try {
        for (var i = 0; i < this.length; i++) {
            iterator(this[i], i);
        }
    } catch (e) {
        if (e !== $break) {
            throw e;
        }
    }
};
Array.prototype.find = function(iterator) {
    for (var i = 0; i < this.length; i++) {
        if (iterator(this[i], i)) {
            return this[i];
        }
    }
};
Array.prototype.reject = function(iterator) {
    var results = [];
    this.each(function(value, index) {
        if (!iterator(value, index))
            results.push(value);
    });
    return results;
};
Array.prototype.any = function(iterator) {
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator(value, index))
        throw $break;
    });
    return result;
};
Array.prototype.pluck = function(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
};
Array.prototype.first = function() {
    if (this.length > 0) {
		return this[0];
	}
	return null;
};
window.$A = function(iterable) {
  if (!iterable) return [];
  if (iterable.toArray) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
};

// adapted from Prototype
/* Based on Alex Arnell's inheritance implementation. */
window.Class = {
  create: function() {
    var parent = null, properties = $A(arguments);
    if (typeof properties[0] == "function")
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, window.Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      var subclass = function() { };
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0; i < properties.length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = jojo.emptyFunction;

    klass.prototype.constructor = klass;

    return klass;
  }
};

window.Class.Methods = {
  addMethods: function(source) {
    var ancestor   = this.superclass && this.superclass.prototype;
    var properties = Object.keys(source);

    if (!Object.keys({ toString: true }).length)
      properties.push("toString", "valueOf");

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && (typeof value == "function") &&
          value.argumentNames().first() == "$super") {
        var method = value, value = Object.extend((function(m) {
          return function() { return ancestor[m].apply(this, arguments); };
        })(property).wrap(method), {
          valueOf:  function() { return method; },
          toString: function() { return method.toString(); }
        });
      }
      this.prototype[property] = value;
    }

    return this;
  }
};

window.$ = function(el) {
    el = Ext.get(el);
    if (el) { //TODO: should probably only decorate the element on the first call to $() on a per element basis
        if (!el._decorated) {
			el.setVisibilityMode(Ext.Element.DISPLAY);
			el.bindEnterKey = function(action) {
				if (action) {
					el.on('keypress', function(e) {
						var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
						if (key === 13) {
							Event.stop(e);
							if (typeof action == "function") {
								action();
							} else if (action.dom) {
								if (action.dom.dispatchEvent) {
									var e = document.createEvent("MouseEvents");
									e.initEvent("click", true, true);
									action.dom.dispatchEvent(e);
								} else {
									action.dom.click();
								}
							}
						}
					});
				}
			};
			el.click = function() { //this is a nice little abstraction to allow divs and other "non-js-clickable" elements to be programattically clicked in non-IE browsers
				if (el.dom.dispatchEvent) {
					var e = document.createEvent("MouseEvents");
					e.initEvent("click", true, true);
					el.dom.dispatchEvent(e);
				} else {
					el.dom.click();
				}
			};
			el._decorated = true;
		}
        return el;
    }
    return null;
};

window.Event = {
    stop: function(evt) {
        evt.stopEvent();
    }
};

window.Element = Ext.Element;

window.$H = function(obj) {
    var keys;
    var ret = {
        get: function(key) {
            return obj[key];
        },
        each: function(iterator) {
            for (var key in obj) {
                var value = obj[key], pair = [key, value];
                pair.key = key;
                pair.value = value;
                iterator(pair);
            }
        },
        find: function(iterator) {
            for (var key in obj) {
                var value = obj[key], pair = [key, value];
                pair.key = key;
                pair.value = value;
                if (iterator(pair)) {
                    return pair;
                }
            }
        },
        keys: function() {
            if (keys) {
                return keys;
            }
            keys = [];
            for (var key in obj) {
                keys.push(key);
            }
			return keys;
        }
    };
    return ret;
};

Object.keys = function(obj) {
	return $H(obj).keys();
};
