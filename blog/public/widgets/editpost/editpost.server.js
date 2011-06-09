exports.getWidget = function(feather, cb) {  
  cb(null, {
    name: "blog.editpost",
    path: "widgets/editpost/",
    prototype: {
      editPost: feather.Widget.serverMethod(function(post, _cb) {
        var sess = this.request.session;
        if (sess && sess.user && feather.auth.api.hasAnyAuthority(sess.user, ['editor', 'admin'])) {
          feather.blog.api.savePost(post, function(err, result) {
            _cb && _cb(err, result);
          });
        } else {
          _cb && _cb('You do not have permission to edit posts.');
        }
      })
    }   
  });
};