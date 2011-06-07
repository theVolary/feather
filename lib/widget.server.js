var sys = require("sys"),
    fs = require("fs"),
    registry = require("./registry");

/*
 * custom tags are not allowed to be in this list
 */
var tagBlacklist = ["widget", "options", "contenttemplate"];

/*
 * registry for custom tag handlers (cannot add a handler for a tag already being handled)
 * also cannot add a handler for tags otherwise handled and in the blacklist
 */
var tagHandlers = new registry();


var tmplExpressions = [
  {
    expression: /\[\[([^\]]*)\]\]/g,
    replace: "{{$1}}"
  },
  {
    expression: /\$\[([^\]]*)\]/g, 
    replace: "${$1}"
  }
];

/**
 * Registers a new tag handler.
 * @param {Object} tagName The name of the custom tag being handled
 * @param {Object} tagRenderer The function that will handling rendering the custom tag into the document
 * @param {Object} disallowedTags An optional list of tags that cannot be embedded within this tag. 
 */
function registerTagHandler(tagName, tagRenderer, disallowedTags) {
  if (tagBlacklist.indexOf(tagName.toLowerCase()) == -1) {
    //the add will already throw if a duplicate handler registration is attempted
    tagHandlers.add({
      id: tagName,
      renderer: tagRenderer,
      disallowedTags: disallowedTags
    });
  } else {
    throw new Error("Cannot add a tag handler for '" + tagName + "'");
  }
};

exports.init = function(options) {
  var feather = options.feather;

  /*
   * register handlers for "template" and "run_template" tags
   */
  registerTagHandler("template", function(options) {
    var $j = options.dom.$j;
    
    //first, throw if the template is not at the top level
    if ($j(options.tag).parent()[0] !== options.widget.container[0]) {
      throw new Error("Template tags may only be defined at the top level within a <widget>.template.html file.");
    }
    
    var tmpl = "<div>" + $j(options.tag).html() + "</div>";
    var client_enabled = options.tag.getAttribute("client_enabled");
    var name = options.tag.getAttribute("name");
    options.widget.templates = options.widget.templates || new registry();
    var template = {
      id: name,
      tmpl: tmpl
    };
    options.widget.templates.add(template);
    $j(options.tag).remove();
    if (client_enabled == "true") {
      var clientTemplate = {
        id: name,
        tmpl: tmpl
      };
      tmplExpressions.each(function(expr) {
        clientTemplate.tmpl = clientTemplate.tmpl.replace(expr.expression, expr.replace);
      });
      var scriptBuilder = [
        'widget.templates.' + name + ' = ' + JSON.stringify(clientTemplate) + '.tmpl;'
      ];
      if (options.widget.templates.items.length == 1) {
        scriptBuilder.unshift('widget.templates = widget.templates || {};');
      }
      options.widget.scripts.push(scriptBuilder.join("\\n"));
    }
  }, ["template", "widget", "dynamic"]); //disallowed tags
  registerTagHandler("insert_template", function(options) {
    var $j = options.dom.$j;
    var name = options.tag.getAttribute("name");
    var template = options.widget.templates.findById(name);
    if (template) {
      $j(template.tmpl).insertBefore(options.tag);
    }
    $j(options.tag).remove();
  }, ["template", "widget", "dynamic", "insert_template"]); //disallowed tags

  /*
   * register the handler for the "dynamic" tag
   */
  var asyncMethods = {};
  registerTagHandler("dynamic", function(options) {
    var $j = options.dom.$j;
    var tmpl = "<div>" + $j(options.tag).html() + "</div>";
    tmplExpressions.each(function(expr) {
      tmpl = tmpl.replace(expr.expression, expr.replace);
    });
    var _t = feather.dom.$j.template(null, tmpl);
    var methodName = options.tag.getAttribute("method");
    var params = options.tag.getAttribute("params");
    var placeHolderId = feather.id();
    var placeHolderStr = '<div id="' + placeHolderId + '"></div>';
    var placeholder = $j(placeHolderStr).insertBefore(options.tag);
    $j(options.tag).remove();
    if (methodName && !asyncMethods[methodName]) {
      var ownerName = methodName.replace(/(.*)[^\.]*\..*/, "$1");
      var owner = feather.ns(ownerName, global, true);
      asyncMethods[methodName] = {
        owner: owner,
        fn: feather.ns(methodName, global, true)
      };
    }
    options.renderOptions.result.renderers.push(function(renderOptions, cb) {
      var data = {request: renderOptions.request};
      if (methodName && typeof asyncMethods[methodName].fn === "function") {
        var _cb = function(err, result) {
          var newStr = err;
          if (!newStr) {
            data.result = result;
            newStr = _t(feather.dom.$j, {data: data}).join("");
          } else {
            newStr = "<div class='templating_error'>" + newStr + "</div>";
          }
          renderOptions.html = renderOptions.html.replace(placeHolderStr, newStr)
          cb();
        };
        if (params) {
          params = eval("[" + params + "]");
        } else {
          params = [];
        }
        params.push(_cb);
        (asyncMethods[methodName].fn).apply(asyncMethods[methodName].owner, params);
      } else {
        var newStr = _t(feather.dom.$j, {data: data}).join("");
        renderOptions.html = renderOptions.html.replace(placeHolderStr, newStr)
        cb();
      }
    });
  }, ["template", "widget", "dynamic"]); //disallowed tags
};