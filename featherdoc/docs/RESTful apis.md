### Creating RESTful APIs
Feather supports easily defining a RESTful API layer for your application via placing endpoint specific logic inside javascript files in the `rest` folder of your app. Feather abstracts the routing definitions a bit to make it a little easier to encapsulate developer intent for each API endpoint. The abstraction added is very minimal... 

Firstly, the name of each .js file inside the `rest` folder becomes the root routing of that individual "API endpoint", which is relatively routed off of the feather-generated base route of `/_rest/`. Note that this means you should not have a folder under `public` named `_rest` as that will result in routing collisions. 

Within each of these RESTful API files, the exports object determines the HTTP verbs and sub-routes you want that particular API endpoint to respond to, and how it should respond. The format of the exports object is best illustrated with a series of examples. As we go through the examples, one major thing to note is that the callbacks functions will automatically trigger the response, and will automatically handle serializing the 2nd argument as JSON (the 1st argument is reserved for errors in the standard nodejs callback style). We do still expose the raw request and response objects so it's possible to override how the response is handled if you don't want to return JSON content, but using the callback functions just removes boilerplate code you'd have to write yourself to add in the appropriate content-type header ("application/json") and to do the serialization. Finally, if you pass a non-null/non-undefined value for the 1st argument to the callback function, feather will make the response code be a 500 (internal server error), and will serialize the error object for you (enabling you to pass non-string error data if you wish).

So let's say you want a RESTful API endpoint for "person" objects (e.g. a router entry that responds to HTTP requests at /_rest/person/*). You would start by adding a `person.js` file inside a top-level-to-your-app folder called `rest`, like so...

    /my_app
      - /rest
        - person.js

The contents of `person.js` might look like this...

    module.exports = {
      "get": {
        "/": function(req, res, cb) {          

          //pseudocode to go to the database and get a collection of people
          my_app.getPeopleFromTheDatabase(function(err, people) {
            
            if (err) cb(err); else {
              //execute the callback, passing the people collection back
              cb(null, people);
            }
          });          
        }
      }
    };

The above API endpoint definition sets up a route handler at `/_rest/person/` that responds to HTTP `GET` requests by getting an array of people from the database and calling the callback function with either the error (if present), or the data from that call.

Note that in the example above, requests to sub-routes will completely fail (your handler will not be executed for say, requests to `/_rest/person/foo`). 

### Sub-routes
In order to add sub-routes, simply continue building up url matching patterns (based on the sinatra-like syntax of Connect/Express)...

    module.exports = {
      "get": {
        "/": function(req, res, cb) {          

          //pseudocode to go to the database and get a collection of people
          my_app.getPeopleFromTheDatabase(function(err, people) {
            
            if (err) cb(err); else {
              //execute the callback, passing the people collection back
              cb(null, people);
            }
          });          
        },

        "/:id": function(req, res, cb) {          

          //pseudocode to go to the database and get a specific person record
          my_app.getPersonFromTheDatabase(req.params.id, function(err, person) {
            
            if (err) cb(err); else {
              //execute the callback, passing the person object back
              cb(null, person);
            }
          });          
        }
      }
    };

Notice in this example, we have added another entry in the "get" config object which maps requests that can now have data passed in after the trailing slash. Accessing that data by name is done via the request.params object (`req.params.id` in our example above). So now requests to `/_rest/person/` will result in a collection being returned while requests to, for example, `/_rest/person/123` would return just the specific person with id "123" (if such a person existed). Please note once again, however, that requests to `/_rest/person/123/foo` will still fail. You can continue to add sub-sub-routes and sub-sub-sub-routes (etc...) in a similar fashion if your API has a need for them.

The same format is used to add handlers for the various HTTP verbs ("post", "delete", "put", etc...). Please note that the verb names in these files must be lowercase (the Connect way).

### Query strings
Query strings are always parsed to JSON objects and added to the request object for you if they are present in the request. So using the examples from above, if you make a GET request to `/_rest/person/?foo=bar`, the "/" handler will be executed, and `req` will have a property on it called `query` which will have a property on _it_ called `foo` with value `"bar"`. NOTE: this uses node's built-in querystring parser; if you need to parse this information differently, just use the raw `req.url` property as you normally would.

### 404 responses
Feather also abstracts sending back a 404 response (document not found). To easily do this, simply pass nothing (or `null`) as the 2nd argument to the callback function. So in the examples above, if either `people` or `person` in the respective handlers is either `null` or `undefined` coming back from the database, feather automatically responds with a 404 status code and text/plain content `Document not found`. Easy as pie.

### The client-side
So now you've got a RESTful API, which you can consume how you would normally consume any other such API. If you're accustomed to using jQuery, you could issue `$.ajax()` calls directly to those HTTP endpoints now. But feather can also generate client proxies for you (that, incidentally, use `$.ajax()` behind the scenes). You can turn this proxy generation on or off via your app's config.json file (the default is _off_). 

To turn the proxy-generation on in feather, add a setting in your config.json file like so...

    {
      "rest": {
        "autoGenerateProxy": true
      }
    }

This will make code available to your client-side that makes it super simple to make calls to your RESTful APIs in the form `feather.rest.<api_name>.<method>(path, [data, ], callback);`. The following is an example of what such code might look like, using our `person` examples from above...

    feather.rest.person.get("/", function(args) {
      if (args.success) {
        doSomethingWithPeople(args.result);        
      } else {
        doSomeErrorHandlingCode(args);
      }
    });

Using these proxy helper functions assumes that your APIs are designed around JSON. If you use feather's supplied callbacks as outlined above to return data from the API methods then you don't have to worry. If you take control of the raw response objects but you still return JSON and you add the appropriate `Content-Type` header (`application/json`), you should also be fine using these proxy helpers. It's when you override the response behavior and alter it in drastic ways (returning non-JSON data, etc...) that you're likely to run into issues using the proxies.

Looking at the example above, you'll see that each API endpoint file from your `/rest` folder is added as an object on the `feather.rest` namespace object (`feather.rest.person` in our example). Then, each verb that you implement handlers for will get a method added to that object (`feather.rest.person.get` in our example). The first argument passed to these per-verb functions is a string that maps to the URI of the resource/sub-route you are trying to interact with. So in this case we're making a request to the base URI for person, which should give us an array of people objects.

If the method being called requires data, pass the data object as the 2nd arg...

    feather.rest.person.put("/", myPerson, function(args) {
      if (args.success) {
        doSomethingWithNewPerson(args.result);        
      } else {
        doSomeErrorHandlingCode(args);
      }
    });