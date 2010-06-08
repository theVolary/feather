function serverCall(options) {
    if (!Jaxer.isOnServer) {
        throw new Error("serverCall() may only be accessed remotely");
    }
    jojo.isCallback = true;
    jojo.init(Jaxer.session["appOptions"]);
    
    //load the widget server definition and create the instance
    var widget = jojo.widget.getInstance(options);
    
    if (widget && options.methodName) {
        widget.fire("serverCallback", {options: options});
        return widget.serverCallResult;
    }
    
    return {foo: "bar"};
}
serverCall.proxy = true;

function pageUnload(options) {
    //release page-based session data...
    Jaxer.session["appOptions"] = null;
    Jaxer.session["clientFiles"] = null;
}
pageUnload.proxy = true;
