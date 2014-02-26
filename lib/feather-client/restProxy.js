(function() {
  
  feather.rest = {};

  feather.bindRestProxy = function(proxyInfo) {
    _.each(proxyInfo.apis, function(api) {
      feather.rest[api.name] = {};
      _.each(api.methods, function(method) {
        feather.rest[api.name][method.name] = function(path, data, cb) {
          var options = null;

          // Freakish hack to allow users to pass in standard function call style of func(options, cb).  
          //   This allows us flexibility for passing more options to $.ajax in the future.
          if (typeof path === "object" && typeof data === "function") {
            options = path;
            cb = data;
            data = null;
          } else {
            options = {
              path: path,
              data: data
            };
          }

          if (typeof data === "function") {
            cb = data;
            data = null;
          }

          var contentType = 'application/json';
          //connect currently has issues with GET and application/json
          if (method.verb.toLowerCase() === "get") {
            contentType = 'text/plain';
          }

          $.ajax({
            url: encodeURI("/_rest/" + api.name + decodeURI(options.path)),
            data: (typeof options.data === "undefined" || options.data === null) ? null : JSON.stringify(options.data),
            type: method.verb,
            dataType: "json",
            headers: options.headers || null,
            contentType: contentType,
            success: function(result) {
              cb && cb({
                success: true,
                result: result
              });
            },
            statusCode: {
              404: function(xhr, textStatus, err) {
                cb && cb({
                  success: false,
                  statusCode: 404,
                  err: err,
                  xhr: xhr,
                  textStatus: textStatus
                });
              },
              500: function(xhr, textStatus, err) {
                cb && cb({
                  success: false,
                  statusCode: 500,
                  err: JSON.parse(xhr.responseText),
                  xhr: xhr,
                  textStatus: textStatus
                });
              }
            }
          });
        };
      });
    });
  };

})();