Hello, feather
--

## Creating your first application
  
  Creating an application is covered in a little more detail in [applications.md](applications.md). For the purposes of this tutorial, we'll assume you have feather installed already and that you have a terminal open to some folder you want to store your feather apps.

  -`1.` Create the app via `feather create-app hello_world`  
  -`2.` Move into the new app via `cd hello_world`  
  -`3.` Run the app via `feather run`  
  -`4.` Test the app by opening a browser and going to http://localhost:8080 (note: 8080 is the default port for feather app development). You should see the text "Light as a Feather".

--

## A simple HTML change

  OK, so now we'll start making changes to the application, working our way through various fundamental concepts in the feather framework...

  The first thing to realize is that "feather pages" are specially named HTML files. Any file in the `public` folder of your app that ends with `.feather.html` will be treated as a "feather page" and will be parsed by feather's specialized parser when your application starts up. This parsing process ultimately figures out what `widgets` your page(s) are embedding, recursively expands all the widget templates (which results in a composite HTML document), automatically collects all the required `client.js` and `css` files used by all of the embedded widgets, and bundles everything into static files that will be served to the browser for you. So the "feather page" can be thought of as the composition layer for `widgets`, which are the basic unit of encapsulating reusable chunks of functionality in your application.

  For now, we'll just make a simple HTML change involving no widgets...

  -`1.` In your favorite text editor, open `hello_world/public/index.feather.html`  
  -`2.` Change the text 'Light as a Feather' to 'Fast as a Bird' and save the file  
  -`3.` (**) Restart the application via the command line (stop via `Ctrl-C` if it's still running and then start via `feather run`)  
  -`4.` Test the change in the browser.

  (**: At the time of writing (v0.2.1 of feather), server side changes (i.e. editing a .feather.html file, or a widget's .server.js or .template.html file) currently require restarting the feather server. We do intend to resolve this fact and enable seamless "hot deployments")

--

## Adding a widget
  
  Now we'll start getting into the heart of the feather framework, which is creating and using widgets. First, a brief discussion to answer the question "What is a widget?"...

  A widget, from feather's perspective, is really just a way of saying "cross-tier component". You will create widgets to encapsulate re-usable chunks of content or functionality (i.e. "loginForm", "videoPlayer", or "helpWizard"). We say "cross-tier" because a widget consists of four distinct files that are seamlessly combined to provide both server side and client side functionality in a nice convenient package. All widgets can be embedded directly into the markup of feather.html pages or inside of other widget templates, and can also be dynamically loaded directly from the client.

  So, to add our first widget to the hello_world app, do the following...

  -`1.` From the `hello_world` folder, create a widget via the command line: `feather create-widget sayHello`

  This will ask you if `hello_world` is OK to use as the namespace of the widget (since we omitted a namespace as the last argument when we ran the command). So far we've typically just stuck with the app name as being the namespace for all widgets; it's a pattern that seems to work for most apps (assuming your app name isn't something long winded). You may want to introduce additional namespaces if your app design is particulary large. After you say "yes", it will then create a folder at `hello_world/public/widgets/sayHello` that contains four files as follows...

  * sayHello.client.js
  * sayHello.css
  * sayHello.server.js
  * sayHello.template.html

  As we move forward we'll be working in those files to implement various changes in UI or functionality for our widgets.

  -`2.` Edit `hello_world/public/widgets/sayHello/sayHello.template.html` in your text editor and add the following text

```
    I am a widget
```

  -`3.` Edit `hello_world/public/index.feather.html` as follows:

```html
    <html>
    <head>
      <title>Index.feather.html</title>
      <resources />
    </head>
    <body>
      <widget id="sayHello1" path="widgets/sayHello/" />
    </body>
    </html>
```

  -`4.` Restart the app and test the changes in the browser. You should now see the text "I am a widget".

--

## Adding UI and client side interactions
  
  Now that you've added your first widget, let's start making it (somewhat) useful. Since we called our widget 'sayHello', let's add a button that when clicked alerts a "hello" message to the user.

  -`1.` Add the following markup to the `sayHello.template.html` file...

```html
    <input id="sayHiBtn" type="button" value="say hello" />
```

  __A note about `id` attributes__
  At this point we'd like to make you aware of an important feature of the feather framework. Let's say you want to add ten instances of this widget to your page. You would simply edit the `index.feather.html` file and add nine more `widget` tags. You must, however, take care that all ten instances have different `id`s (in fact the framework will hollar at you during startup if you fail to meet this requirement and will error out). The reason this is true is so that all the elements on the page can be gauranteed to be uniquely ID'ed and so that behavioral code in the widgets' `client.js` file can safely reference _only_ the DOM elements associated with _that_ _instance_. In this way, you can have as many instances of a single widget on the screen as you want without having to write any code to manage that stuff (it's managed for you). To accomplish this, feather auto prefixes an id chain to elements based on the hierarchy of where each instance is embedded. So in our example above (with just a single instance embedded in the page), the button will actually have an id of `sayHello1_sayHiBtn` in the DOM (because we gave the `widget` tag an id of `sayHello1` when we embedded it). As already mentioned, when you write client code within the widget's `client.js` file you will not have to worry about knowing what that id hierarchy looks like; you'll be able to reference the scoped elements by their relative IDs via code like `this.get('#sayHiBtn')`, which we'll demonstrate shortly.

  -`2.` Add the following style rule to the `sayHello.css` file (let's make this button really ugly)...

```css
  .hello_world_sayHello input {
    border: 3px dashed green;
    font-family: verdana;
    font-size: 20px;
    color: red;
  }
```
  For per-widget scoped styling, there is always an implicit class name for each widget that will be in the form of `"namespace_widgetName"`. Since our namespace is `hello_world` and our widget name is `sayHello`, the implicit class name is `hello_world_sayHello`. This is very handy when you want to create styles that target only those elements scoped to instances of this specific widget.

  It's very important to note that ID based selectors in your CSS are a no-no. Going back to the discussion about how IDs are treated in feather, let's pretend you attempted the following CSS rule...

```css
  .hello_world_sayHello #sayHiBtn {
    border: 3px dashed green;
    font-family: verdana;
    font-size: 20px;
    color: red;
  }
```
  The problem, of course, is that because widgets are meant to be reusable and you will be embedding them in (potentially) arbitrary locations in your app, the id prefixes will be (and should remain) unknown within the context of your CSS files. As demonstrated above, the actual id of the button in the DOM in our example will be `sayHello1_sayHiBtn`, and not just `sayHiBtn`, therefore the CSS selector above will actually find 0 elements. You may, then, be tempted to target your CSS rule as `.hello_world_sayHello #sayHello1_sayHiBtn`. That would also be a mistake because it is tightly coupling the CSS rule to a specific embed hierarchy, and this rule will break the second that hierarchy changes for whatever reason.

  -`3.` Bind a click handler in the `sayHello.client.js` file as follows...

```js
  feather.ns("hello_world");
  (function() {
    hello_world.sayHello = feather.Widget.create({
      name: "hello_world.sayHello",
      path: "widgets/sayHello/",
      prototype: {
        onInit: function() {
          
        },
        onReady: function() {
          
          this.domEvents.bind(this.get('#sayHiBtn'), 'click', function() {
            alert("Hi there!");
          });

        }
      }
    });
  })();
```

  Since this is our first look at the `client.js` file, let's take a moment to examine the boilerplate to understand what's going on. 

  - The first line is a call to `feather.ns` (where 'ns' stands for 'namespace'). `feather.ns` is a helper function that encapsulates the safe (non-overwriting) creation of a variable at an arbitrary path within a given context (where the default context is the global context, or `window` on the client). The call `feather.ns("hello_world")` first checks to see if the `hello_world` variable has already been created in the global context (`window` in this case), and does nothing if it has, or creates an empty object to represent that namespace if it hasn't (this assures that the order in which you embed same-namespaced widgets won't inadvertantly affect the creation of this object.). `feather.ns` is very handy and offers a few more options, which will be explained in greater detail in the API docs.
  - Next you'll notice the very standard module pattern (an immediately-called anonymous function), whose body is a single statement that creates a widget constructor at `hello_world.sayHello`. The constructor arguments template (the object being passed into the `feather.Widget.create` factory function) includes the widget boilerplate properties of `name`, `path`, and `prototype`. `name` seems redundant at first glance, but is important because it will be used in various places behind the scenes. The same is true of `path`; this is mainly used to pass into feather's dynamic widget loading mechanism so the server can easily resolve which widget is being requested. Finally, the `prototype` property is exactly that... the javascript prototype of the resulting widget constructor. 

  There are two important methods of interest on all client-side widget prototypes: `onInit` and `onReady`. 

  - The `onInit` function is called immediately after a widget instance is created on the client, but before the DOM has been updated with that widget's HTML from its template. This would be where you would add any initialization code (i.e. the stuff you'd normally put into a constructor function). 
  - The `onReady` method is called immediately after the widget's HTML has been rendered into the DOM, and this is the point at which it's safe to interact with the widget's DOM elements (e.g add event handlers). 

  So, with the understanding that `onReady` is the point at which our widget's DOM elements are ready, you can then see this is where we write the event binding code on our button.

  _jQuery integration and the domEvents registry_
  There is no mistaking that jQuery is the world's most popular client side toolkit. For this reason (and also because it's amazing), feather relies on jQuery heavily. jQuery is auto-included in all feather pages, and is not optional in the feather framework (yes, feather is opinionated on this topic). In our example code above, jQuery's `.bind()` method is what's actually being used behind the scenes. Feather widgets, however, all contain their own local registry of event handlers: the `.domEvents` property. The reason this exists is because widgets are able to be disposed of (imagine a single page interface where many widgets are dynamically created and destroyed as the user performs various actions). As each widget is destroyed, this local domEvents "registry" is used to automatically clean up all of that instance's listeners. This frees you from having to worry about memory leaks. _In short_: within a widget, use `.domEvents.bind()` instead of `$.bind()`.

  ---
  Next let's dissect `this.get('#sayHiBtn')`:

  Going back to the previous discussion about how DOM IDs are treated in feather, remember that the actual ID of the button on the page will be `sayHello1_sayHiBtn` because this instance's ID is `sayHello1`. Just like the `.domEvents` method is a light wrapper around jQuery's `.bind()` method, all widgets have a `.get()` method that is a light wrapper around jQuery's top level selector function (i.e. `$()` itself). This wrapper simply auto-manages scoping your selector to the instance you call it from, which includes auto-prefixing ID based selectors appropriately with the acual ID of the instance. 



  a. adding a button
    aa. discussion on id attribute
  b. styling the button via css file
    ba. discuss implicit css class naming 
    bb. point out why id-based selectors are a no-no
  c. add interaction via binding a click handler
    ca. discussion of client-side widget events (onInit, onReady)
    cb. discussion on jQuery integration
    cc. discussion on this.domEvents and this.get

--

5. Adding a server-side RPC method
  a. implement the prototype and add a feather.Widget.serverMethod
  b. add client-side code to click handler to call server method
  c. change server method to accept arguments (change client code to pass args)
  d. change return type of server method
  e. show how to pass an error to the client and how to handle it
6. Adding a second widget
  a. embed as sibling
  b. embed as child via contentTemplate
    ba. show how to use <content/> tag to control contentTemplate placement
    bb. discussion on parent-child relationship & show how to access embedded widget on client
  c. adding/calling client-side methods
  c. demonstrate event pub/sub on client-side
7. Making a widget configurable via options
  a. show how to use the <options> tag section
    aa. discuss default server-centric behavior and show client_enabled=true behavior
8. Using the template
  a. discussion of jQuery.tmpl integration
  b. show that the widget itself is the data container for templating
  c. demonstrate how to fetch external data for use in template
    ca. explain that this is intended for static data and that dynamic data templating will be done via the client
  d. show how to pass configuration down into embedded widgets via template variables in option tags
  e. show how to use the template tag and insert_template tag (server-centric)
    ea. show how to automatically send templates to the client and how to use them
    eb. discuss the difference between curly braces and square braces in template variables
  f. demonstrate datalinking via form tags
9. Brief discussion of jQueryUI integration and how to disable
10. Dynamically loading a widget from the client
  a. demonstrate embedding into an existing container
  b. demonstrate using the dialog system (assumes jQueryUI integration is enabled)
    ba. brief discussion on creating a custom containerizer function
  c. discuss serverOptions vs. clientOptions
11. Discussion of 'client-only' widgets
12. Solving dynamic data requirements via client-centric thinking

---- 
