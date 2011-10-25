// This is a less perfect implementation of the inherits function,
// designed to work in cases where ES5 is not available.
//
// Note that it is a bit longer, and doesn't properly deal with
// getter/setters or property descriptor flags (enumerable, etc.)


function inherits (c, p, proto) {
  function F () { this.constructor = c }
  F.prototype = p.prototype;
  var e = {};
  for (var i in c.prototype) if (c.prototype.hasOwnProperty(i)) {
    e[i] = c.prototype[i];
  }
  if (proto) for (var i in proto) if (proto.hasOwnProperty(i)) {
    e[i] = proto[i];
  }
  c.prototype = new F();
  for (var i in e) if (e.hasOwnProperty(i)) {
    c.prototype[i] = e[i];
  }
  c._super = p;
}