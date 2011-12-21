var _ = require("underscore")._,
  connectRouter = require("./router_connect"),
  DomResource = require("./dom").DomResource;

//TODO: refactor this function generator to be mostly client-side to prevent sending so much code to from the server
var apiTmplStr = [
  'feather.rest = {};',
  '{{each(i, api) apis}}',
  ' feather.rest["${api.name}"] = {};',
  ' {{each(i, method) api.methods}}',
  '   feather.rest["${api.name}"]["${method.name}"] = function(path, data, cb) {',
  '     if (typeof data === "function") {',
  '       cb = data;',
  '       data = null;',
  '     }',
  '     $.ajax({',
  '       url: "/_rest/${api.name}" + path,',
  '       data: typeof data === "undefined" || data === null ? null : JSON.stringify(data),',
  '       type: "${method.verb}",',
  '       dataType: "json"',
  '       contentType: "application/json",',
  '       success: function(result) {',
  '         ',
  '       }',
  '     });',
  '   }',
  ' {{/each}}',
  '{{/each}}'
].join('\n');

exports.generateProxy = function(options) {
  var dom = new DomResource({
    onceState: {
      ready: function() {
        if (options.files && options.files.length) {
          var apiTmpl = dom.$j.template(null, apiTmplStr); //apiTmpl(dom.$j, {data: me}).join("")
          var replacements = {apis: []};
          _.each(options.files, function(fileName) {
            var base = fileName.split(".")[0];
            var api = require(appOptions.appRoot + "/rest/" + fileName);
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
        }
      }
    }
  });  
};