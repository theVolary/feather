var _ = require("underscore")._,
  connectRouter = require("./router_connect"),
  DomResource = require("./dom").DomResource,
  fs = require("fs");

//TODO: refactor this function generator to be mostly client-side to prevent sending so much code to from the server
var apiTmplStr = [
  '(function() {',
    'feather.bindRestProxy({{html proxyInfo}});',
  '})();'
].join('\n');

exports.generateProxy = function(options, cb) {
  var dom = new DomResource({
    onceState: {
      ready: function() {
        if (options.files && options.files.length) {
          var apiTmpl = dom.$j.template(null, apiTmplStr);
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
          var str = apiTmpl(dom.$j, {
            data: {
              proxyInfo: JSON.stringify(replacements)
            }
          }).join("");
          var proxyPath = options.appOptions.publicRoot + "/__restProxy.js";
          fs.writeFileSync(proxyPath, str);
          cb(null, {
            path: "/__restProxy.js",
            prefix: options.appOptions.publicRoot
          });
        } else {
          cb();
        }
        process.nextTick(function() {
          dom.dispose();
        });        
      }
    }
  });  
};