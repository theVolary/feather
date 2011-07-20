

/* ========== engine.client.js ========== */

feather.ns("blog");
(function() {
  
  blog.engine = feather.widget.create({
    name : "blog.engine",
    path : "widgets/engine/",
    prototype: {
      initialize: function($super, options){
        $super(options);
      },
      checkUser: function() {
        var me = this;
        if (feather.auth.user && (feather.auth.user.hasAnyAuthority(['admin', 'editor']))) {
          me.toolbar.addButton({ name: 'new', tooltip: 'New Blog Post', after:'refresh' });
        }
      },
      onReady: function(args){
        var me = this;
        me.checkUser();
        me.toolbar.on("refresh", function() {
          me.latestposts.refreshPosts();
        });
        me.toolbar.on("new", function() {
          me.editPost();
        });
        me.latestposts.on("editPost", function(args) {
          me.editPost(args.post);
        });
        feather.auth.api.on('authenticated', function() {
          me.checkUser();
        });
        feather.auth.api.on('loggedOut', function() {
          me.toolbar.removeButton({name:'new'});
        });
      },
      editPost: function(post) {
        var me = this;
        var id = feather.id();

        feather.widget.load({
          id: id,
          path: "widgets/editpost/",
          clientOptions: {
            model: {post: post},
            containerOptions: {
              title: "Edit Post",
              width: 800,
              height: 350,
              modal: true,
              buttons: {
                SAVE: function() {
                  var w = feather.widget.widgets.findById(id);
                  w.savePost(function(err) {
                    if (!err) {
                      w.dispose();
                      me.latestposts.refreshPosts();
                    }
                  });
                },
                Cancel: function() {
                  var w = feather.widget.widgets.findById(id);
                  w.dispose();
                }
              }
            }
          }
        });
      }
    }
  });
})();


/* ========== header.client.js ========== */

feather.ns("blog");
(function() {	

	blog.header = feather.widget.create({
		name: "blog.header",
		path: "widgets/header/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
				var me = this;
				//document.title = me.options.title;
			}
		}		
	});
	
})();


/* ========== toolbar.client.js ========== */

feather.ns("blog");
(function() {	
  var template = '<span class="button ${name}" title="${tooltip}">&nbsp;</span>';
  
  blog.toolbar = feather.widget.create({
    name: "blog.toolbar",
    path: "widgets/toolbar/",
    prototype: {
      initialize: function($super, options) {
        $super(options);
      },
      onReady: function(args) {
        var me = this;
			  
        me.addButton({ name:'refresh', tooltip: 'Refresh' });
      },
      addButton: function(options, callback) {
        var me = this;
        var button = $.tmpl(template, options);
        if (!options.after) {
          me.container.append(button);
        } else {
          if (typeof(options.after) === 'string') {
            me.get('.'+options.after).after(button);
          } else {
            button.after(after);
          }
        }
        
        if (callback) {
          me.on(options.name, callback);
        }
        
        me.domEvents.bind(button, 'click', function(e) {
          me.fire(options.name);
        });
        
        return button;
			},
      removeButton: function(options) {
        var me = this;
        if (options.name) {
          me.get('.'+options.name).remove();
        }
      }
    }		
  });	
})();


/* ========== latestposts.client.js ========== */

feather.ns("blog");
(function() {
	
	blog.latestposts = feather.widget.create({
		name : "blog.latestposts",
		path : "widgets/latestposts/",
		prototype : {
			initialize : function($super, options) {
				$super(options);
				var me = this;
			},
      onReady: function() {
        var me = this;
        feather.auth.api.on('authenticated', function() {
          me.checkUser();
        }, me); //pass disposable object to track disposal to clean up handlers (disposable objects are expected to fire a 'disposed' event)
        feather.auth.api.on('loggedOut', function() {
          me.checkUser();
        });
        this.bindUI();
      },
      bindUI: function() {
        var me = this;
        
        // Bind a click event to the headers to expand / collapse them.
        me.domEvents.bind(me.get(".blogentry h3"), "click", function(event) {
          var target = $(this); //note: 'this' inside jQuery .bind functions === the element that triggered the event
          if (target[0]) {
            var content = target.next('p');
            if (content.hasClass('collapsed')) {
              content.removeClass('collapsed');
              target.val('-');
            } else {
              content.addClass('collapsed');
              target.val('+');
            }
          }
        });
      },
      refreshPosts: function() {
        var me = this;
        me.server_getPosts(function(args) {
          if (args.success) {
            me.domEvents.unbindAll(); //avoid memory leaks
            me.get("#list").html("");
            $.tmpl(me.templates.posts, {result: args.result}).appendTo(me.get("#list"));
            me.bindUI();
            me.checkUser();
          }
        });
      },
      checkUser: function() {
        var me = this;
        if (feather.auth.user && (feather.auth.user.hasAnyAuthority(['admin', 'editor']))) {
          $('.blogentry h3').prepend(function(index, html) {
            return '<input type="button" value="Edit" postid="' + $($('.blogentry h3')[index]).attr('postid') + '" class="btnEditPost" />';
          });
          me.domEvents.bind(me.get(".btnEditPost"), "click", function(event) {
            event.stopPropagation();
            var postId = $(this).attr('postid');
            var post = {
              id: postId,
              summary: $('#'+postId+'_summary').text(),
              post: $('#'+postId+'_post').text()
            };
            me.fire("editPost", {post: post});
          });
        } else {
          me.get(".btnEditPost").remove();
        }
      }
		}
	});

})();


/* ========== signin.client.js ========== */

feather.ns("blog");
(function() {

	blog.signin = feather.widget.create({
		name: "blog.signin",
		path: "widgets/signin/",		
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
				var me = this;
        
        /**
         * create an FSM to handle ui states
         */
        var fsm = new feather.fsm.finiteStateMachine({
          states: {
            initial: {
              stateStartup: function(fsm, args) {
                if (me.get("#signoutBtn").length) {
                  return fsm.states.loggedIn;
                }
                return fsm.states.loggedOut;
              }
            },
            loggedIn: {
              stateStartup: function(fsm, args) {
                if (!me.get("#signoutBtn").length) {
                  me.get("#signInPanel").html("");
                  $.tmpl(me.templates.signedIn, {}).appendTo(me.get("#signInPanel"));
                }
                //wire the signInHandler
                me.signOutHandler = me.domEvents.bind(me.get("#signoutBtn"), "click", function() {
                  feather.auth.api.logout(function(err) {
                    if (!err) {
                      fsm.fire("loggedOut");
                    } else {
                      me.get('#message').empty().append(err);
                    }
                  });                  
                });
              },
              loggedOut: function(fsm, args) {
                return fsm.states.loggedOut;
              },
              leavingState: function(fsm, args) {
                me.signOutHandler.unbind();
                me.signOutHandler = null;
              }
            }, //end loggedIn state
            loggedOut: {
              stateStartup: function(fsm, args) {
                if (!me.get(".templating_error").length) {
                  if (!me.get("#signinBtn").length) {
                    me.get("#signInPanel").html("");
                    $.tmpl(me.templates.signedOut).appendTo(me.get("#signInPanel"));
                  }
                  //wire the signInHandler
                  me.signInHandler = me.domEvents.bind(me.get("#signinBtn"), "click", function() {
                    var user = me.get('#username').val();
                    var pass = me.get('#password').val();
                    feather.auth.api.login(user, pass, function(err) {
                      if (!err) {
                        fsm.fire("loggedIn");
                      } else {
                        me.get('#message').empty().append(err);
                      }
                    }); // end login call.
                  }); // end signinButton click
                }
              }, 
              loggedIn: function(fsm, args) {
                return fsm.states.loggedIn;
              },
              leavingState: function(fsm, args) {
                me.signInHandler.unbind();
                me.signInHandler = null;
              }
            } //end loggedOutState
          }
        });
			} // end onReady
		}
	});

})();


/* ========== search.client.js ========== */

feather.ns("blog");
(function() {

	blog.search = feather.widget.create({
		name : "blog.search",
		path : "widgets/search/",
		prototype : {
			initialize : function($super, options) {
				$super(options);
			},
			onReady : function(args) {
				var me = this;
			}
		}
	});

})();


/* ========== exportdb.client.js ========== */

feather.ns("blog");
(function() {	
	blog.exportdb = feather.widget.create({
		name: "blog.exportdb",
		path: "widgets/exportdb",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
				var me = this;
				this.domEvents.bind(this.get("#exportBtn"), "click", function() {
				  var msg = me.get("#export-message");
				  msg.empty().append('Exporting...<br/>');
          me.server_runExport(function(result) {
            var toAppend = "";
            if (result.success) {
              toAppend = result.result;
            } else {
              if (typeof(result.err) === "string") {
                toAppend = result.err
              } else {
                result.err.message;
              }
              if (result.source) {
                toAppend += '; source: ' + result.source;
              }
            }
				    msg.append(toAppend + '<br />')
				  });
				});
			}
		}		
	});	
})();


/* ========== importdb.client.js ========== */

feather.ns("blog");
(function() {	
	blog.importdb = feather.widget.create({
		name: "blog.importdb",
		path: "widgets/importdb/",
		prototype: {
			initialize: function($super, options) {
				$super(options);
			},
			onReady: function(args) {
		  	var me = this;
  			this.domEvents.bind(this.get("#importBtn"), "click", function() {
  			  var msg = me.get("#import-message");
  			  msg.empty().append('Importing...<br/>');
          me.server_runImport([me.get("#overwrite").attr('checked')],function(result) {
            var toAppend = result.success ? result.result : (typeof(result.err) === "string") ? result.err : result.err.message;
  			    msg.append(toAppend + '<br />');
  			  });
  			});
  		}
		}		
	});	
})();


/* ========== chat.client.js ========== */

(function() {
  
  feather.ns("blog");
  
  var chatChannel = feather.socket.subscribe({id: "blog:chat"});

  blog.chat = feather.widget.create({
    name: "blog.chat",
    path: "widgets/chat/",
    prototype: {
      notifier: null,
      initialize: function($super, options) {
        $super(options);
        if (window.Audio) { //window reference required to avoid breaking error during check if undefined
          this.notifier = new Audio();
          this.notifier.src = '/widgets/chat/notify.wav';
          this.notifier.load();
        }
      },
      onReady: function() {
        var me = this;
        
        this.bindUI();
        
        /**
         * update the UI when other clients connect
         */
        chatChannel.on("connection", function(args) {
          alert("connection");
        });
        
        /**
         * respond to other clients' messages
         */
        chatChannel.on("chat", function(args) {
          me.newMessage({
            name: args.data.name,
            message: args.data.message,
            remote: true
          });
        });
      },
      bindUI: function() {
        var me = this,
            domEvents = this.domEvents,
            namebox = me.get("#namebox"),
            chatbox = me.get("#chatbox");

        namebox.focus(function() {
          namebox.unbind();
          namebox[0].value = "";
          namebox.removeClass("grey");
        });
        
        chatbox.focus(function() {
          chatbox.unbind('focus');
          chatbox[0].value = "";
          chatbox.removeClass("grey");
        });
        
        var sendMessage = function() {
          var data = {
            message: chatbox[0].value,
            name: namebox[0].value,
            remote: false
          };
          me.newMessage(data);
          chatChannel.send("chat", data);
        };
        
        /**
         * binding the chat button to update local ui 
         * as well as broadcast to other clients that might be connected
         */
        domEvents.bind(me.get("#chatBtn"), "click", sendMessage);
        domEvents.bind(chatbox, "keyup", function(e) {
          var e = window.event || e;
          if (e.keyCode == 13) {
            sendMessage();
          }
        });
      },
      newMessage: function(data) {
        var conversation = this.get("#conversation");
        $.tmpl(this.templates.message, data).appendTo(conversation);
        conversation.scrollTop(conversation.height());
        if (data.remote && this.notifier) {
          this.notifier.load();
          this.notifier.play();
        }
      }
    } // end prototype
  });
})();


/* ========== emptytemplate.client.js ========== */

feather.ns("blog");
(function() {

  blog.emptytemplate = feather.widget.create({
    name : "blog.emptytemplate",
    path : "widgets/emptytemplate/",
    prototype : {
      initialize : function($super, options) {
        $super(options);
      },
      onReady : function(args) {
        var me = this;
        var id = feather.id();

        feather.widget.load({
          id: id,
          path: "widgets/clientwidget/",
          serverOptions: {
            foo: "bar"
          },
          clientOptions: {
            containerOptions: {
              title: "test",
              width: 500,
              height: 500,
              modal: true
            },
            on: {
              ready: function(args){ //args.sender here will be the new widget instance
                alert("on ready: " + args.sender.id);
              }
            }
          }
        });
      }
    }
  });

})();
