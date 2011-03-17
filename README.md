jojojs
======

#### Overview
jojojs is a full-featured widget-based web framework implemented in pure js. 
The main goal is to enable rapid development of powerful RIA-type apps (long running single-page applications).

Since this is meant to be a full-featured framework, there will likely be some dependencies (like jQuery and CouchDB, for example). 
This is not intended to be a bits-and-pieces library where each concern is its own standalone module. 
Where possible (and sensible), we will work on modularizing certain things, but just keep in mind that that is not a primary goal of the project.

In the end, the intent is to use jojojs to create a browser-based development platform where real-time collaboration is first-class.
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
  - you have both npm and nvm installed (https://github.com/isaacs/npm) (https://github.com/creationix/nvm)
  - Since this is still very early, I'm also assuming if you're going through these instructions it's because you are a contributor to the project. 
Thus, I'm going to include some workflow instructions.
  - This is obviously not a requirement, but for sake of convenience I'm basing paths of the following root folder (just because that's our internal convention): ~/mainline
- Setup 
  - first, fork the project (via your github account) from https://github.com/ryedin/jojojs
  - clone locally (and recursively to auto pull the submodules), and remember to add the remote to 'upstream' as explained here: http://help.github.com/fork-a-repo/
    - $: cd ~/mainline
    - $: git clone --recursive [your-fork-url]
    - $: cd jojojs
    - $: git remote add upstream git@github.com:ryedin/jojojs.git
  - Dependencies (this list will change, so please continue to check it, especially as a first place to look if you do an update and run into errors that look like missing dependencies) (NOTE: yes, we plan on create a complete npm-encapsulated package to ease this pain, but for now we're still playing with things too much)
    - $: npm install connect
    - $: npm install jsdom
    - $: npm install socket.io
  - Symlink Requirements (this section is also subject to change)
    - in order to break out of Connect.static's security model, we currently have a symlink requirement for each app (/blog and /test are examples of apps)
    - the symlink must point to the /jojojs/lib directory and must be named 'jojolib'
      - $: cd blog
      - $: ln -s ../lib jojolib
      - $: cd ../test
      - $: ln -s ../lib jojolib
- Data
  - 3/15/2011: as of today, the blog app now requires CouchDB (and currently, running on the same machine as the node app).
      - install couch via the instructions for your OS (http://wiki.apache.org/couchdb/Installation)
      - from Futon (http://localhost:5984/_utils/), create a db called "jojoblog"
      - from that new db, click "New Document", then go to the "Source" tab on the far right. Paste the contents of /jojojs/blog/data/design.json into the text area and save the document.
      - repeat the above step for docs 1-5
      - assuming the couch install is local to the node app, you should now be able to hit the blog app from a browser and have 5 blog post summaries show up.
      
At this point you should be able to run the blog app and hit it from a browser:
- $: cd ~/mainline/jojojs/blog
- $: node app.js
- in a browser: http://localhost:8088  (replace localhost with the appropriate IP address or hostname if running on a VM... obviously :P)
      
NOTE: AS OF NOW (3/11/2011), you must run the 'app.js' file for your app (/blog, /test, etc.) from within that directory!