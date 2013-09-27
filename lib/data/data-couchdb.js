var cradle = require("cradle"),
    inherits = require("inherits"),
    eventPub = require("../event-publisher");
    
var DataProvider = exports.DataProvider = function(options) {
  DataProvider.super.apply(this, arguments);
  this.name = "CouchDB";
    
  options = options || {};
  
  if (!options.hostUrl) { 
		throw new Error("hostUrl is required");
	}
	this.hostUrl = options.hostUrl;
	this.dbName = options.dbName;
	this.dbPort = options.dbPort || 5984;
	this.cache = !!options.cache; //make sure cache is explicitly turned off by default
	this.raw = options.raw;
	this.auth = options.auth;
	this.secure = options.secure;

  this.connection = new(cradle.Connection)(this.hostUrl, this.dbPort, {
    cache: this.cache,
    raw: this.raw,
    secure: this.secure,
    auth: this.auth
  });
	this.db = this.connection.database(this.dbName);
};
  
DataProvider.prototype.getDb = function() {
  return this.db;
};

inherits(DataProvider, eventPub);