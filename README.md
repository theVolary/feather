feather
======

### Overview
feather is a full-featured widget-based web framework implemented in pure js. 
The main goal is to enable rapid development of powerful RIA-type apps (long running single-page applications).

Since this is meant to be a full-featured framework, there will likely be some dependencies (like jQuery and CouchDB, for example). 
This is not intended to be a bits-and-pieces library where each concern is its own standalone module. 
Where possible (and sensible), we will work on modularizing certain things, but just keep in mind that that is not a primary goal of the project.

In the end, the intent is to use feather to create a browser-based development platform where real-time collaboration is first-class.
Short of that

### Features

- Fill
  - This
  - In

### Setup and Contribution Instructions
First of all, not to be too obvious but this project requires node.js. Specifically, we intend to support node.js on *nix platforms.
I assume the Windows/cygwin flavors of node builds should also work but we aren't going to go out of our way to support it.

- Assumptions
  - you have a github account and understand git and github basics (forking, cloning, etc.)
  - you are running node v0.4.x
  - you have both npm and nvm installed ([https://github.com/isaacs/npm](https://github.com/isaacs/npm)) ([https://github.com/creationix/nvm](https://github.com/creationix/nvm))
  - Since this is still very early, I'm also assuming if you're going through these instructions it's because you are a contributor to the project. 
Thus, I'm going to include some workflow instructions.
  - This is obviously not a requirement, but for sake of convenience I'm basing paths of the following root folder (just because that's our internal convention): ~/mainline
- Setup 
  - first, fork the project (via your github account) from [https://github.com/ryedin/feather](https://github.com/ryedin/feather)
  - clone locally (and recursively to auto pull the submodules), and remember to add the remote to 'upstream' as explained here: [http://help.github.com/fork-a-repo/](http://help.github.com/fork-a-repo/)
    - $: `cd ~/mainline`
    - $: `git clone --recursive [your-fork-url]`
    - $: `cd feather`
    - $: `git remote add upstream git@github.com:ryedin/feather.git`
  - Dependencies (this list will change, so please continue to check it, especially as a first place to look if you do an update and run into errors that look like missing dependencies) (NOTE: yes, we plan on create a complete npm-encapsulated package to ease this pain, but for now we're still playing with things too much)
    - $: `npm install connect` (version 1.4 is required)
    - $: `npm install jsdom`
    - $: `npm install socket.io`
    - $: `npm install cradle`
    - $: `npm install yuitest`
    - $: `npm install daemon`
    = $: `npm install colorize` (Added 5/10/2011; used by the CLI)
    - $: `cd featherdoc`
    - $: `mkdir node_modules` (If this step is omitted, npm will install it in feather's copy of node_modules rather than create the folder for you.)
    - $: `npm install node-markdown` (required for the featherdoc app)
    - $: `cd ..`
  - Setup
    - $: `bin/setup.sh` This will create the FEATHER_HOME environment variable in your user's `~/.profile` file.  It will also add feather's bin dir to your path.
  - Symlink Requirements (this section is also subject to change)
    - 5/5/2011: as of today, the symlinks are no longer required.
    - in order to break out of Connect.static's security model, we currently have a symlink requirement for each app (/blog and /test are examples of apps)
    - the symlink must point to the /feather/lib directory and must be named 'featherlib'
      - $: `cd blog`
      - $: `ln -s ../lib featherlib`
      - $: `cd ../test`
      - $: `ln -s ../lib featherlib`
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
