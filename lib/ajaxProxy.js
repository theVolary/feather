var Widget = require("./widget"),
  parser = require("./parser");

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

function loadWidget(req, res, cb) {
  parser.parseWidget({
    id: req.body.data.widgetId,
    path: req.body.data.path,
    options: req.body.data.options
  }, function(err, _result) {
    var result = {
      err: err,
      success: err ? false : true,
      result: _result
    };
    cb && cb(res, result);
  });
}

function mismatchSessionResponse(res) {
  res.writeHead(406, {'Content-Type': 'text/plain'});
  res.end("mismatching session IDs");
}

module.exports = function(req, res, next) {
  //normalize properties based on socket.io versions
  req.sessionId = req.sessionID;
  
  //make sure message sid matches server sid
  if (!req.body.sid || req.body.sid.split('.')[0] !== req.sessionId) {
    mismatchSessionResponse(res);
  } else {
    //whitelisted handlers for actions
    switch (req.body.action) {
      case "rpc":
       doRpc(req, res, respond);
       break;
      case "loadwidget":
       loadWidget(req, res, respond);
       break;
    }
  }
};