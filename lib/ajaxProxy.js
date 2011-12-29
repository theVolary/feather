var Widget = require("./widget");

function respond(res, result) {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(result));
}

function doRpc(req, res, cb) {
  Widget.doRpc(req, null, req.body.data, function(err, _result) {
    var result = {
      err: err,
      success: err ? false : true,
      result: _result
    };
    cb && cb(res, result);
  });
}

module.exports = function(req, res, next) {
  switch (req.body.action) {
    case "rpc":
     doRpc(req, res, respond);
     break;
  }
};