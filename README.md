feather
======  

### Overview
feather is a full-featured widget-based web framework implemented in pure js. 
The main goal is to enable rapid development of powerful RIA-type apps (long running single-page applications with real-time data being seamless).

Since this is meant to be a full-featured framework, there will likely be some hard dependencies (like jQuery and CouchDB, for example). We will refactor things over time to be as generic as is prudent (and we of course welcome help). Some dependecies will be abstracted out, some may linger.

Note: This project is not meant to be a competing project to Express (in fact we started this project before Express existed) as it aims to fill a very different development niche, although we certainly have "make an Express plugin" as a roadmap item.

Where possible (and sensible) we will work on extracting granular standalone npm modules, but please keep in mind that that is not a primary goal of the project at this time. We are first and foremost concerned with creating a powerful framework for building out arbitrarily complex RIAs that have deeply integrated and seamless support for the real-time web.

In the end, the intent is to use feather to create a browser-based development platform where real-time collaboration is first-class. We believe app developers should be empowered to express the unique behaviors of their application as quickly as possible, so the aim is to remove as much ceremony, boilerplate, and process as possible from the development cycle until we are left with only an elegant expression layer that produces apps that "just work". We don't care if you call these goals crazy; we happen to be just a little bit crazy.

### Installation
First of all, not to be too obvious but this project requires node.js. Specifically, we intend to support node.js on *nix platforms. I assume the Windows/cygwin flavors of node builds should also work but we aren't going to go out of our way to support it right now.

- Use `fvm` (found here: [https://github.com/ryedin/fvm](https://github.com/ryedin/fvm))
  - Using fvm is the recommended (and for now the only "supported") way to install feather. It is patterned after nvm (node version manager), and makes it very easy to manage the dependencies and track your local environments with each new published feather tag. For now just keep checking the tags here on github to know when to upgrade your local feather "distro".
  - The caveat to that advice is if you intend to hack on feather directly or want to play with the sample app that for now lives in this repo (we intend to create a much better set of samples when we have some time). In that case we still recommend using fvm to get the initial install working, and then clone this repo to get convenient access to the source. If hacking/modifying on feather source, you can then use the `fvm use ./` command from the top-level feather source folder to use that version instead of an installed-from-a-tag version.

### More Documentation...
There is another app in this repo that we intend to clean up and host for the community, which is the featherdoc app. For now, just know that there are some markdown docs here: [https://github.com/theVolary/feather/tree/master/featherdoc/docs](https://github.com/theVolary/feather/tree/master/featherdoc/docs). They aren't complete yet, but at least they're something. 
