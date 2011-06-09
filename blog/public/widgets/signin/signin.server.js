exports.getWidget = function(feather, cb) { 
  cb(null, {
    name: "blog.signin",
    path: "widgets/signin/",
    prototype: {
      verifySignin: feather.Widget.serverMethod(function(_cb) {
        if (this.request.session && this.request.session.user) {
          _cb(null, this.request.session.user);
        } else {
          _cb("No user in session");
        }
      })
    }   
  });
};