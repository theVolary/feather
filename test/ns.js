var should = require('should'),
  ns = require('../lib/ns');

var obj = {
  'foo.bar': 123,

  foo2: {
    bar: 456
  }
};

describe('ns Tests', function() {  

  it('should allow fetching string based keys with "." characters', function(done) {

    var val = ns('foo.bar', obj, true);
    should.exist(val);
    val.should.equal(obj['foo.bar']);
    done();
  });

  it('should fetch keys without "." character', function(done) {

    var val = ns('foo2.bar', obj, true);
    should.exist(val);
    val.should.equal(obj.foo2.bar);
    done();
  });

  it('should add objects to context and fetch values', function(done) {

    var val = ns('foo2.bar2', obj);
    should.exist(val);

    obj.foo2.bar2.foo = 456;
    val = ns('foo2.bar2.foo', obj, true);
    val.should.equal(456);
    done();
  });

});