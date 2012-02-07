var _ = require("underscore")._,
  connectRouter = require("./router_connect"),
  fs = require("fs");

var apiTmplStr = [
  '(function() {',
    'feather.bindRestProxy({{html proxyInfo}});',
  '})();'
].join('\n');

exports.generateProxy = function(options, cb) {
  if (options.files && options.files.length) {
    var replacements = {apis: []};
    _.each(options.files, function(fileName) {
      var base = fileName.split(".")[0];
      var api = require(options.appOptions.appRoot + "/rest/" + fileName);
      var apiReplacements = {
        name: base,
        methods: []
      };
      replacements.apis.push(apiReplacements);
      _.each(connectRouter.methods, function(verb) {
        if (api[verb]) {
          apiReplacements.methods.push({
            name: verb,
            verb: verb.toUpperCase()
          });
        }
      });            
    });
    var str = apiTmplStr.replace("{{html proxyInfo}}", JSON.stringify(replacements));
    var proxyPath = options.appOptions.publicRoot + "/__restProxy.js";
    fs.writeFileSync(proxyPath, str);
    cb(null, {
      path: "/__restProxy.js",
      prefix: options.appOptions.publicRoot
    });
  } else {
    cb();
  }
};