(function() {
  
  feather.rest = {};

  feather.bindRestProxy = function(proxyInfo) {
    _.each(proxyInfo.apis, function(api) {
      feather.rest[api.name] = {};
      _.each(api.methods, function(method) {
        feather.rest[api.name][method.name] = function(path, data, cb) {
          if (typeof data === "function") {
            cb = data;
            data = null;
          }
          $.ajax({
            url: "/_rest/" + api.name + path,
            data: (typeof data === "undefined" || data === null) ? null : JSON.stringify(data),
            type: method.verb,
            dataType: "json",
            contentType: "application/json",
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
                  err: err,
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