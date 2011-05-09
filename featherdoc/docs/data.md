# feather Data API Documentation #
## Configuration ##
The data API is configured right from the app options in app.js.  For application data, you will want to configure the `appdb` object within your options `data` object.  

### Example AppDb Configuration ###
    var options = {
	    // ...
	    data: {
		    appdb: {
			    hostUrl: 'http://localhost',
          dbName:'featherblog',
          auth: { username:'featheradmin', password:'password' }
		    }
	    }
	    // ...
    }

### Configuration Options ###
By default, the appdb options are passed through to the data provider, and as such are dependent on what provider you decide to use.  At the time of this writing, only a CouchDB provider exists, so its options will be covered here.  
With that being said, the only common option at this time is `provider`.  This option determines which data provider your connection will use.  

*  provider : name of the data provider to use.  Defaults to 'couchdb'.

### CouchDB Data Provider ###
The CouchDB data provider uses the node [cradle](http://cloudhead.io/cradle) library internally.

#### CouchDB Options ####
*  hostUrl: **Required**.  The URL of your CouchDB server (e.g. http://localhost)
*  dbName: **Required**.  The name of the database to connect to.
*  dbPort: The port CouchDB is listening on.  Defaults to 5984.
*  cache: whether or not to cache documents on retrieval so that _rev is not necessary for modifications
*  raw: whether or not to return raw documents, or cradle [response](https://github.com/cloudhead/cradle/blob/master/lib/cradle/response.js) objects.
*  auth: an object containing username and password properties.  Set to null if your CouchDB server is set up for public access
*  secure: set to true to use SSL communications

## Usage ##
Most methods found in the data library simply pass through to the cradle layer.  As such, they have identical signatures to the methods in that library.  
The following methods are available through the data API:  

*  get
*  view
*  save
*  merge
*  put
*  post
*  head
*  all
*  list
*  remove
*  saveAttachment
*  getAttachment
*  exportDb - exports all documents from the database into local json files stored in your app's "data" folder.
*  importDb - imports local documents stored in JSON files from your app's "data" folder into the database.

As they become necessary, more methods will be added to the API.