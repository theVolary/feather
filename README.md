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

### Setup and Contribution Instructions
First of all, not to be too obvious but this project requires node.js. Specifically, we intend to support node.js on *nix platforms. I assume the Windows/cygwin flavors of node builds should also work but we aren't going to go out of our way to support it right now.

_Note: these instructions are intended for use during the early stages of the project, until we stabilize things a bit and have a nice build script or npm package to give you._

- UPDATE (8/30/11): For non-contributors who just want to kick the tires or are otherwise interested in "just using feather"... please use this tool to manage feather installs: https://github.com/ryedin/fvm. It's extremely easy to use and will make it a snap to install new tags as we relese them (allowing you to switch between active tags as you please).
- Assumptions
  - you have a github account and understand git and github basics (forking, cloning, etc.)
  - you are running node v0.4.x
  - you have both npm and nvm installed ([https://github.com/isaacs/npm](https://github.com/isaacs/npm)) ([https://github.com/creationix/nvm](https://github.com/creationix/nvm))
  - Since this is still very early, I'm also assuming if you're going through these instructions it's because you are a contributor to the project. 
Thus, I'm going to include some workflow instructions.
  - This is obviously not a requirement, but for sake of convenience I'm basing paths of the following root folder (just because that's our internal convention): ~/mainline
- Setup 
  - first, fork the project (via your github account) from [https://github.com/theVolary/feather](https://github.com/theVolary/feather)
  - clone locally (and recursively to auto pull the submodules), and remember to add the remote to 'upstream' as explained here: [http://help.github.com/fork-a-repo/](http://help.github.com/fork-a-repo/)
    - $: `cd ~/mainline`
    - $: `git clone --recursive [your-fork-url]`
    - $: `cd feather`
    - $: `git remote add upstream git@github.com:theVolary/feather.git`
    - if you forget the --recursive argument when cloning the repo you can also run the following commands
    - $: `git submodule init`
    - $: `git submodule update`
  - Feather relies on several dependencies.  Most are installed by the setup script mentioned below, but in case any fail, they are listed here. **DO NOT RUN THESE MANUALLY UNLESS setup.sh FAILS!**
      - Dependencies (this list will change, so please continue to check it, especially as a first place to look if you do an update and run into errors that look like missing dependencies) (NOTE: yes, we plan on create a complete npm-encapsulated package to ease this pain, but for now we're still playing with things too much)
        - $: `npm install connect` (version 1.4 is required)
        - $: `npm install jsdom`
        - $: `npm install socket.io`
        - $: `npm install cradle`
        - $: `npm install yuitest`
        - $: `npm install daemon`
        - $: `npm install colorize` (Added 5/10/2011; used by the CLI)
        - $: `npm install uuid`
        - $: `npm install clean-css`
        - $: `npm install uglify-js`
    - In featherdoc app
      - $: `mkdir node_modules` (If this step is omitted, npm will install it in feather's copy of node_modules rather than create the folder for you.)
      - $: `npm install node-markdown` (required for the featherdoc app)
  - Setup
    - $: `bin/setup.sh` This will create the FEATHER_HOME environment variable in your user's `~/.bashrc` file if it exists.  Otherwise it will add them to your `~/.profile` file.  It will also add feather's bin dir to your path.  Finally it will attempt to install all of the dependencies of the framework.
    - open `~/.bashrc` and ensure the PATH var in Feather Vars section looks like "export PATH=$FEATHER_HOME/bin:$PATH"
    - At this point, you should be able to run "feather help" and get the usage of the CLI.
- Data
  - 3/15/2011: as of today, the blog app now requires CouchDB.
      - install couch via the instructions for your OS ([http://wiki.apache.org/couchdb/Installation](http://wiki.apache.org/couchdb/Installation))
      - from Futon ([http://localhost:5984/_utils/](http://localhost:5984/_utils/)), create a db called "featherblog"
      - if couch is not installed on localhost, edit app.js and modify the hostUrl value in the data.appdb variable
      - start the blog application (See Starting the Sample App below)
      - browse to [http://localhost:8080/](http://localhost:8080/) and press the Go button where it says "Import the database"
      - refresh the page in your browser.  You should now see 3 sample blog entries.  If you click on them they should expand to show the full blog post.
- Starting the Sample App  
At this point you should be able to run the blog app and hit it from a browser:  
  - $: `feather run ~/mainline/feather/blog`  
  - in a browser: [http://localhost:8080/](http://localhost:8080/)  (replace localhost with the appropriate IP address or hostname if running on a VM... obviously :P) 
