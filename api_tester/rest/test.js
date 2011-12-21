var feather = require("../lib/feather").getFeather();

module.exports = {
  "get": {
    "/": function(req, res, cb) {
      cb(null, [
        {name: "foo"}, 
        {name: "foo2"}
      ]);
    },
    "/:id": function(req, res, cb) {
      if (req.params.id === "123") {
        cb(null, {
          name: "foo"
        });
      } else if (req.params.id === "789") { //test 404
        cb();
      } else { //test 500
        cb("error, 123 expected");
      }
    },
    "/:id/:prop": function(req, res, cb) {
      cb(null);
    }
  },

  "post": {
    "/": function(req, res, cb) {
      cb(null, [
        {name: "foo"}, 
        {name: "foo2"},
        req.body //this should be auto-parsed from the client
      ]);
    }
  },

  "put": {
    "/": function(req, res, cb) {
      cb(null, [
        {name: "foo"}, 
        {name: "foo2"},
        req.body //this should be auto-parsed from the client
      ]);
    }
  },

  "delete": {
    "/": function(req, res, cb) {
      cb(null, [
        {name: "foo"}, 
        {name: "foo2"},
        req.body //this should be auto-parsed from the client
      ]);
    }
  }
};