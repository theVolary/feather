Outline
--

1. Creating your first application.
  a. Configuration
  b. Running the app (intro to the CLI)
2. Modifying the page
  a. index.feather.html
  b. discussion on feather.html pages
  c. (for now) need to restart the server
3. Adding a widget
  a. feather create-widget
  b. discussion of widget files
  c. embedding the widget on the page
  d. discussion of client-side widget events (onInit, onReady)
4. Adding UI and client side interactions
  a. adding a button
    aa. discussion on id attribute
  b. styling the button via css file
    ba. discuss implicit css class naming 
    bb. point out why id-based selectors are a no-no
  c. add interaction via binding a click handler
    ca. discussion on jQuery integration
    cb. discussion on this.domEvents and this.get
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