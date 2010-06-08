jojo.ns("jojo.debug");

(function() {
    
    jojo.debug.log = function(message) {
        if (Jaxer.isOnServer) {
            Jaxer.Log.info(message);
        }
    };
    
    jojo.debug.section = function(title) {
        jojo.debug.log("*****   " + title + "   ***********************************************");
    };
    
    jojo.debug.dump = function(logText, obj) {        
        jojo.debug.log("jojo.debug.dump() action: " + logText + " ------------------------------------");
        jojo.debug.log("JSON STRING:");
        jojo.debug.log(Ext.encode(obj));
    };
    
})();

