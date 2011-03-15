var couchdb = {


	cradle: null,
	db: null,
	hostUrl: null,
	dbName: null,
	dbPort: 5984,
	cache: true,
	raw: false,
	auth: { username:"", password:"" },
	useAuth: false,
	secure: false,
	
	initialize: function(options) {
		if (!options.hostUrl) { 
			// TODO: Do some sort of logging here.
			return false; 
		} else {
			this.hostUrl = options.hostUrl;
		}
		this.dbName = options.dbName || null;
		this.dbPort = options.dbPort || 5984;
		if (options.cache) { this.cache = options.cache; }
		if (options.raw) { this.raw = options.raw; }
		if (options.auth) {
			this.auth = options.auth;
			this.useAuth = true;
		}
		if (options.secure) { this.secure = options.secure; }
		
		this.cradle = require("cradle");
		
		this.db = new(this.cradle.Connection)(this.hostUrl, this.dbPort, {
			cache: this.cache,
			raw: this.raw,
			secure: this.secure,
			auth: this.useAuth ? this.auth : undefined
		}).database(this.dbName);
	}, // end initialize
	
	/**
	 * Queries a view at the connected db.
	 * 
	 * @path a string of the form "design_doc_name/view_name"
	 * @options options object.  Options:
	 *   <ul>
	 *   <li>callback: the callback function to call with the result</li>
	 *   <li>any other options you wish to pass to the view (startKey, endKey, limit, key, descending, etc.)</li>
	 *   </ul>
	 */
	view: function(path, options, callback) {
	  
	  return this.db.view(path, options, callback);
	},
	
	exportDb: function(options) {
	  // export design documents
	  // export other documents (get all, write to json files)
	},
	
	exportView: function(path, options) {
	  var dataFolder = "/data";
	  
	},
	
	importDb: function(options) {
	  // read json files from data folder.
	  // save documents to couchdb.
	}
	
	
};

exports.db = couchdb;

