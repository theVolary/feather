var p  = require("path"),
    fs = require("fs");

module.exports = {
  mkdirpSync: function(path, mode) {
    mode = mode || 0755;

    if (!path || path.length < 1) {
      return {result:false, err:"path is required"};
    } else {

      var absolute = (path[0] === "/"),
          parts = path.split('/'),
          curr  = "/";
      if (!absolute) {
        curr = process.cwd;
      }

      while (parts.length > 0) {
        curr = p.join(curr, parts.shift());
        if (! p.existsSync(curr)) {
          try {
            fs.mkdirSync(curr, mode);
          } catch (ex) {
            console.error(ex.message);
            return {result:false, err:ex.message};
          }
        }
      }
      return {result:true};
    } // end else
  }
};