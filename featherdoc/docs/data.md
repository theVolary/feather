# feather Data API Documentation #
## Configuration ##
The data API is configured in your app's config.json file.  For application data, you will want to configure the `appdb` object within your options `data` object.  

### Example AppDb Configuration ###
    // ...
    "data": {
      "appdb": {
        "hostUrl": "http://localhost",
        "dbName":"featherdoc",
        "auth": { 
          "username":"featheradmin", 
          "password":"password" 
        }
      }
    }
    // ...

### Configuration Options ###
By default, the appdb options are passed through to the data provider, and as such are dependent on what provider you decide to use.  At the time of this writing, only a CouchDB provider exists, so its options will be covered here.  
With that being said, the only common option at this time is `provider`.  This option determines which data provider your connection will use.  

*  provider : name of the data provider to use.  Defaults to 'couchdb'.

### Data Provider Errors ###
The data API follows the nodejs convention of executing callbacks with any error that occurred as the first parameter.  This parameter will always be in the form of a javascript `Error` instance, containing the standard `name` and `message` properties, and also a stack trace string as `stack`.

### Generic Data Provider Methods ###
All data providers should implement the following methods.

* get(options, callback);
* save(options, callback);
* remove(options, callback);
* exists(options, callback);
* find(options, callback);
* findNextPage(options, callback); // Helper method for find.
* findPreviousPage(options, callback); // Helper method for find.

#### Data Options and Callback Parameters by Method ####

##### get option properties #####
* `id` - **Required if ids is blank**.  A string id to retrieve one document by its id.
* `ids` - **Required if id is blank**.  An array of string ids to retrieve.

##### get callback parameters
* `error`
* `documents` - the data document if found.  If an array of ids was passed, then this will be an array of the documents.

##### save option properties #####
* `doc` - **Required if docs is blank**.  The document to save.  If _id and _rev properties are present, it will update the document.  If they are missing, it will save the object as a new document.
* `docs` - **Required if doc is blank**.  An array of documents to save.  _id and _rev handling is the same as for the *doc* option.

##### save callback parameters #####
* `error`
* `results` - If one document was passed for save, the updated document.  If an array was passed, this is an array of objects.  If the save for any items in the array failed, an `Error` is returned in the array at its index.  This error will also have a `doc` property containing the original document that failed to save. 

##### remove option properties #####
* `doc` - **Required if docs is blank**.  A document to delete.  Must have _id and _rev properties at a minimum.
* `docs` - **Required if doc is blank**. An array of documents to delete.  Must have _id and _rev properties at a minimum.

##### remove callback parameters #####
* `error`
* `results` - if more than one document was removed, an array of the results containing either errors for failed removals or the document itself.  If one document was specified and the removal was successful, boolean `true` value.

##### exists option properties #####
* `id` - **Required**.  The id to check.

##### exists callback parameters #####
* `error`
* `exists` - true or false

##### find option properties #####
* `source` - **Required**.  For CouchDB, this should be a string of the format `designDocName/viewName`.
* `pagination` - an optional javascript object that contains pagination rules for the search.  Options are:  

``

    pagination: {
      pageNumber: integer,
      pageSize: integer,
      cachePageBoundaries: true/false,
      pageBoundaries: []
    }

* `criteria` - object that contains any criteria to pass along to the data provider, in this case, CouchDB options such as `key, startkey, endkey, limit, offset`, etc.  See [the CouchDB wiki](http://wiki.apache.org/couchdb/HTTP_view_API#Querying_Options) for all of the available options.

##### find pagination options #####
* `pageNumber` - The page number you want to retrieve
* `pageSize` - The size of the page you want to retrieve.  Set to 0 to disable pagination.
* `cachePageBoundaries` - boolean.  If true, the view will be queried for all page boundary keys and will cache them in the `pageBoundaries` array unless the array is already populated.  If this is false and pagination is enabled, the CouchDB `skip` option will be used, which is less efficient.
* `pageBoundaries` - An array of page boundary keys for the given source.  If blank or empty and cachePageBoundaries is set to true, this will be populated before returning the first page of data.  This **must** be passed on subsequent calls for the caching to work properly.

##### find callback parameters #####
* `error`
* `results` - an object containing two properties: 
  * documents - array of the documents found in the search
  * options - an object containing the updated options submitted to the method (including pagination updates).

### CouchDB Data Provider ###
The CouchDB data provider uses the node [cradle](http://cloudhead.io/cradle) npm module internally.

#### CouchDB Options ####
*  hostUrl: **Required**.  The URL of your CouchDB server (e.g. http://localhost)
*  dbName: **Required**.  The name of the database to connect to.
*  dbPort: The port CouchDB is listening on.  Defaults to 5984.
*  cache: whether or not to cache documents on retrieval so that _rev is not necessary for modifications
*  raw: whether or not to return raw documents, or cradle [response](https://github.com/cloudhead/cradle/blob/master/lib/cradle/response.js) objects.
*  auth: an object containing username and password properties.  Set to null if your CouchDB server is set up for public access
*  secure: set to true to use SSL communications

## Usage ##
Most methods found in the data library simply pass through to the cradle layer.  As such, they have identical signatures to the methods in that library.  The exceptions to this rule are the generic methods mentioned above.

The following additional methods are available through the data API, and pass straight through to CouchDB:

*  view
*  merge
*  put
*  post
*  all
*  list
*  saveAttachment
*  getAttachment

As they become necessary, more methods will be added to the API.