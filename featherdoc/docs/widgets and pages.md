### Widgets, Pages and Finite State Machines, Oh My!
At the core of feather application development lies a simple yet robust and powerful fundamental building block, which we simply call the _widget_. We could have called this _component_ or _control_ or some other apt name, but we chose widget because that seems like a sufficient term to encapsulate what it is and in today's world it seems like probably the more relevant option. The widget then, as it were, is the basic unit of application level cross-tier functionality encapsulation in feather. What we mean by that is that a widget consists of a UI (html and css) and client _and_ server side functionality. As _widget_ is the basic unit of encapsulation, the `feather page` is the composition layer. A `feather page` is really just a specially templated and instrumented HTML page that just so happens to end with a `.feather.html` extension. 

So you then use these constructs to design your application in terms of pages that each are made up of a composition of widgets, where the widgets represent the most granular level of encapsulation that makes sense for your application (ideally maximizing code re-useability and easing the burden of change management in your app). In this way, you can also very easily create a large application that is just a single long running page. How you choose to deliver the application is up to you, but just know that feather is designed to make multi-page _and_ single page application designs easy, as well as designs that have a healthy mixture of both (i.e. a series of smaller single-page apps in a single project linked together via separate URL-navigable pages).

There is another fundamental building block in feather that you probably won't find (at least not explicitly) in many other web frameworks, and that is the `Finite State Machine`, or from here on out referred to as `FSM`. FSMs are nothing new in computer science, but we think they are very under-utilized. You can use feather forever and never create or explicitly use an FSM in your app, but we think if you did so then there's a high probability that you're Doing It Wrong. FSMs are the preferred mechanism for expressing a wide range of stateful application flows. Clearly, statefulness is best employed on the client, but it can also be quite helpful on the server. As such, the same FSM construct is available in feather server side as well as client side. Think of the FSM as the holy grail of controllers. We'll get back to that later.

### Creating a widget and consuming it in a page
Let's start by creating a widget in our project. This is done with the `feather create-widget [namespace] <widgetName>` command on the command line at the root of your app. First of all, we're assuming you've read the `Creating a New Application` section of the [applications.md](applications.md) document and have a hello_world feather app. If not, please do that now if you wish to follow along as we go. So then, using that app as the example, you'd do the following:

    $ cd ~/feather_apps/hello_world
    ~/feather_apps/hello_world$ feather create-widget sayHello

This will ask you if `hello_world` is OK to use as the namespace of the widget (since we omitted a namespace when we ran the command). So far we've typically just stuck with the app name as being the namespace for all widgets; it's a pattern that seems to work for most apps, though you may want to introduce additional namespaces if your app design is particulary large. After you say "yes", it will then create a folder at ` ~/feather_apps/hello_world/public/widgets/sayHello` that contains four files as follows...

  * sayHello.client.js
  * sayHello.css
  * sayHello.server.js
  * sayHello.template.html

We will revisit the nature of each of these files in a bit, but for now let's just start with a few examples of how we can add UI and interactivity to a widget. In the following series of snippets and explanations we're going to simply show you code and ask you to run the app to see what it does. Some of the code will go unexplained in this series, but by the end it will all make sense, and we'll come back for more details later in the documentation.

So what is our new widget going to look like and what will it do? Quite simply it will contain a button that when clicked alerts "hello" (what, you thought it would do something useful when our app's name is hello_world?). Let's start with the UI...

_sayHello.template.html_

    <input type="button" id="sayHiBtn" value="say hello" />

The `<widgetName>.template.html` file of a given widget is that widget's UI expression. This file may contain HTML as well as other embedded widgets (via the `<widget>` tag), [jQuery templating](http://api.jquery.com/jquery.tmpl/), and a couple other _special_ tags that we'll get to later. For now we'll just stick with vanilla HTML.

So, if you're following along, add the above markup to your `sayHello.template.html` file. The next step is to actually consume (embed) this widget in a page. 

and then issue `feather run` from the command line you'll be able to hit the page from your browser (default URL of `http://localhost:8080/`) and see our completely useless button.



___ more to come ___