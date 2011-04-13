# jojojs Authentication / Authorization Documentation #

## Overview ##
The jojojs auth framework provides an interface for common web site authentication and authorization.  It provides standard login/logout (authentication) functionality, as well as permission checking (authorization) mechanisms.  At this time it does not support OAuth-type authentication mechanisms, but it is on the roadmap to do so in the future.

## Usage ##
On both client and server sides of the application, the auth interface is available via the variable `jojo.auth.api`.  Both sides provide a similar API.

### Client-Side ###
The client side auth API is implemented as a finite state machine.  As such, any widget can listen to events on the API to be notified of state changes.  In addition, methods can be called on the API to initiate authentication and so on.  

#### Events ####
The following events can be listened for on the client-side auth API.

* authenticated: fired when user authentication is complete.  `jojo.auth.user` is available at this time.
* loggingOut: fired when user logout is initiated.
* loggedOut: fired when the user is logged out.
* loginSuccessful: fired after successful login, but before entering the authenticated state.
* loginFailed: fired when a login attempt fails.  The data associated with this event is the error that occurred.

To listen for any of these events, add a listener in the onReady handler of your widget:  

	jojo.auth.api.on('authenticated', function() {
	  me.checkUser();
	});
	jojo.auth.api.on('loggedOut', function() {
	  me.toolbar.removeButton({name:'new'});
	});
