var fc = require("../feather-config");

describe('FeatherConfig', function() {

  describe('No default options specified', function() {
    it('should have an empty config object', function(done) {
      fc.init({}, function(err, config) {

        if (err) throw err;
        config.should.not.have.ownProperty('option-level');
        done();
      });
    });
  });

  describe ("Default options specified", function() {

    it('should have default-level options', function(done) {
      fc.init({ defaultConfigPath: 'test/default-options.json' }, function(err, config) {
        if (err) throw err;
        config.should.have.property('option-level', 'default');
        done();
      });
    });
  });

  describe ("Default options hook specified", function() {
    it('should have modified default options level', function(done) {
      fc.init({ defaultConfigPath: 'test/default-options.json', 
          defaultOptionsHook: function(opts) { opts['option-level'] = 'default-modified'; opts.defaultHook = true; }}, 
          function(err, config) {
        if (err) throw err;
        config.should.have.property('option-level', 'default-modified');
        config.should.have.property('defaultHook', true);
        done();
      });
    });
  });

  describe("App conf file overrides default options", function() {
    it('should have app-level options', function(done) {
      fc.init({ defaultConfigPath: 'test/default-options.json', appDir: 'test', appConfigPath: 'test/app-options.json' }, function(err, config) {
        if (err) throw err;
        config.should.have.property('option-level', 'app');
        config.should.have.property('option-should-not-change', 'locked');
        done();
      });
    });
  });

  describe("Internal environment overrides app and default options", function() {
    it('should have internal env-level options', function(done) {
      fc.init({ defaultConfigPath: 'test/default-options.json', appDir: 'test', appConfigPath: 'test/app-internal-env-options.json' }, function(err, config) {
        if (err) throw err;
        config.should.have.property('option-level', 'internal-env');
        done();
      });
    });
  });

  describe("External environment overrides app and default options", function() {
    it('should have external env-level options', function(done) {
      fc.init({ defaultConfigPath: 'test/default-options.json', appDir: 'test', appConfigPath: 'test/app-env-options.json' }, function(err, config) {
        if (err) throw err;
        config.should.have.property('option-level', 'env');
        done();
      });
    });
  });

  describe("Command line environment use", function() {
    it('should have env-level options', function(done) {
      process.argv.push('env');
      process.argv.push('test');
      fc.init({ defaultConfigPath: 'test/default-options.json', appDir: 'test', appConfigPath: 'test/app-options.json' }, function(err, config) {
        if(err) done(err);
        config.should.have.property('option-level', 'env');
        done();
      });
    });
  });

  describe ("Command line options", function() {

    it('should be processed and override all other options', function(done) {
      process.argv.push("overrideOptionLevel");
      process.argv.push("cmd");
      fc.init({ defaultConfigPath: 'test/default-options.json', 
                  appDir: 'test', 
                  appConfigPath: 'test/app-env-options.json', 
                  commandLineArgsHook: function(arg, remainingArgs, cmdLineOpts) {
                    if (arg === 'overrideOptionLevel') {
                      cmdLineOpts['option-level'] = remainingArgs.shift();
                      console.info("option-level is now " + cmdLineOpts['option-level']);
                    }
                  }
                },
          function(err, config) {
            if (err) throw err;
            console.log(config.dumpBuildInfo());
            config.should.have.property('option-level', 'cmd');
            done();
          }
      );
    });
  });

  describe ("Safe get call", function() {
    fc.init({appDir: 'test', appConfigPath: 'test/internal-get-test.json'}, function(err, config) {

      if (err) done(err);

      it('should return null if the value does not exist', function() {
        var val = fc.safeGet('obj1.oops.obj3', config);
        require("should").not.exist(val);
      });

      it('should return a value', function() {
        var val = fc.safeGet('obj1.obj2.obj3', config);
        val.should.equal(42);
      });

      it('internal get should return null if the value does not exist', function() {
        var val = config.safeGet('obj1.oops.obj3');
        require("should").not.exist(val);
      });

      it('internal get should return a value', function() {
        var val = config.safeGet('obj1.obj2.obj3');
        val.should.equal(42);
      });
    });
  });

});

/*

Tests to run:

* Test default options pickup if exists.
* App dir provided or not
* App config path provided or not
* Default options hook
* Cmd line options overrides a default
* environment testing

*/