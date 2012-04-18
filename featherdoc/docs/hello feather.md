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

  This will ask you if `hello_world` is OK to use as the namespace of the widget (since we omitted a namespace as the last argument when we ran the command). So far we've typically just stuck with the app name as being the namespace for all widgets; it's a pattern that seems to work for most apps, though you may want to introduce additional namespaces if your app design is particulary large. After you say "yes", it will then create a folder at `hello_world/public/widgets/sayHello` that contains four files as follows...

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
11. Solving dynamic data requirements via client-centric thinking