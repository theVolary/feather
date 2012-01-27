feather
======  

### Overview
feather is a full-featured widget-based web framework implemented in pure js. 
The main goal is to enable rapid development of powerful RIA-type apps (long running single-page applications with real-time data being seamless).

Since this is meant to be a full-featured framework, there will likely be some hard dependencies (like jQuery and CouchDB, for example). We will refactor things over time to be as generic as is prudent (and we of course welcome help). Some dependecies will be abstracted out, some may linger.

Note: This project is not meant to be a competing project to Express as it aims to fill a very different development niche, although we certainly have "make an Express plugin" as a roadmap item.

Where possible (and sensible) we will work on extracting granular standalone npm modules, but please keep in mind that that is not a primary goal of the project at this time. We are first and foremost concerned with creating a powerful framework for building out arbitrarily complex RIAs that have deeply integrated and seamless support for the real-time web.

In the end, the intent is to use feather to create a browser-based development platform where real-time collaboration is first-class. We believe app developers should be empowered to express the unique behaviors of their application as quickly as possible, so the aim is to remove as much ceremony, boilerplate, and process as possible from the development cycle until we are left with only an elegant expression layer that produces apps that "just work". We don't care if you call these goals crazy; we happen to be just a little bit crazy.

### Features

- Fill
  - This
  - In
  - Before
  - v0.2.0

### Installation
First of all, not to be too obvious but this project requires node.js. Specifically, we intend to support node.js on *nix platforms. I assume the Windows/cygwin flavors of node builds should also work but we aren't going to go out of our way to support it right now.

NOTE: as of 12/31/11 we are still on node v0.4.12. We recommend using [https://github.com/creationix/nvm](nvm) to manage your node versions (which is what our tool `fvm`, mentioned below, is based on)

- Use `fvm` (found here: [https://github.com/ryedin/fvm](https://github.com/ryedin/fvm))
  - Using fvm is the recommended (and for now the only "supported") way to install feather. It is patterned after nvm (node version manager), and makes it very easy to manage the dependencies and track your local environments with each new published feather tag. For now just keep checking the tags here on github to know when to upgrade your local feather "distro".
  - The caveat to that advice is if you intend to hack on feather directly or want to play with the sample app that for now lives in this repo (we intend to create a much better set of samples when we have some time). In that case we still recommend using fvm to get the initial install working, and then clone this repo to get convenient access to the source. If hacking/modifying on feather source, you can then use the `fvm use ./` command from the top-level feather source folder to use that version instead of an installed-from-a-tag version.

### The (not so great but is a starting point for now) sample app
We have a little pseudo-working "blog" app that we made in the initial days of feather development and haven't yet had time to revisit, which you'll find here in the `/blog` folder. 

- Data
  - The sample blog app is based on integration with CouchDB...  
      - install couch via the instructions for your OS ([http://wiki.apache.org/couchdb/Installation](http://wiki.apache.org/couchdb/Installation))
      - from Futon (http://localhost:5984/_utils/), create an admin user named "featherblog" with password "password" and then create a db called "featherblog"
      - add the design doc to the database from this gist: [https://gist.github.com/1490342](https://gist.github.com/1490342)
      - start the blog application (See Starting the Sample App below)
      - browse to http://localhost:8080/
      - login with the "featheradmin" / "password" credentials, add posts, play around, etc...
      - open the same page in another browser tab and use the chat widget

- Starting the Sample App  
At this point you should be able to run the blog app and hit it from a browser:  
  - $: `cd /path/to/feather/blog`
  - $: `feather run` 
  - in a browser: [http://localhost:8080/](http://localhost:8080/) 

### More Documentation...
There is another app in this repo that we intend to clean up and host for the community, which is the featherdoc app. For now, just know that there are some markdown docs here: [https://github.com/theVolary/feather/tree/master/featherdoc/docs](https://github.com/theVolary/feather/tree/master/featherdoc/docs). They aren't complete yet, but at least they're something. 
