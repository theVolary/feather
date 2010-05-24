(function() {
	
	function loadCoreFiles(files, options) {
		//clear client.js file if in debug mode
		var clientPath = options.root + options.appFileName + ".client.js";
		clientPath = clientPath.replace(/\//g, "\\");
		var clientFile = null;
		if (!jojo.isCallback && (options.debug || !Jaxer.File.exists(clientPath))) {
			if (Jaxer.File.exists(clientPath)) {
				Jaxer.File.remove(clientPath);
			}
			clientFile = new Jaxer.File(clientPath);
			clientFile.create();
		}
		
		for (var i = 0; i < files.length; i++) {
			var file = files[i];
			if (!file) {
				continue;
			}
			var filePath = Jaxer.Web.resolve(file.path);
			if (file.runat == "server" || file.runat == "both") {
				Jaxer.load(filePath, window, "server", true, false, false);
			}
			if (clientFile && (file.runat == "client" || file.runat == "both")) {
				filePath = options.root + file.path;
				filePath = filePath.replace(/\//g, "\\");
				var fileContents = Jaxer.File.read(filePath);
				var clientScript = fileContents;
				if (file.runOnReady) {
					clientScript = <>
						jojo.stateMachine.onceState(jojo.stateMachine.states.ready, function() {'{'}
							{fileContents}
						});
					</>;
					clientScript = clientScript.toString().replace(/\&lt;/g, "<").replace(/\&gt;/g, ">");
				}
				Jaxer.File.append(clientPath, clientScript);
			}
		}
		if (clientFile) {
			clientFile.close();
			clientFile = null;
		}
	}
	
	/**
	 * Helper method (and cache object) to indicate files that need to be loaded on the client
	 * @param {String} path
	 */
	jojo.includedFiles = {};
	jojo.include = function(files) {
		if (typeof files === "string") {
			files = [{path: files}];
		}
		files.each(function(file) {
			if (!jojo.includedFiles[file.path]) {
				var filePath = Jaxer.Web.resolve(file.path);
				filePath = jojo.appOptions.root + file.path;
				filePath = filePath.replace(/\//g, "\\");
				var fileContents = Jaxer.File.read(filePath);
				file.type = file.type || "js";
				switch (file.type) {
					case "js":
						Ext.DomHelper.append(document.body, {
							tag: "script",
							type: "text/javascript",
							html: fileContents
						});
						break;
				}
			}
		});
	};
	
	/**
	 * Framework init function
	 */
	jojo.init = function(options) {
		options = options || {};
		//root dir for the app
		options.root = Jaxer.request.documentRoot + (options.root || "/jojo/");
		options.appName = options.appName || "jojo";
		options.appFileName = Jaxer.request.pageFile.replace(options.root, "");
				
		//use inflection properties to determine various optional system files to load,
		//make an attempt at being smart about dependencies (maintaining this here might be slightly difficult as we add more properties to deal with)
		options.data = options.data || {enabled: false};
		options.data.provider = options.data.provider || {};		
		
		jojo.appOptions = options;
		Jaxer.session["appOptions"] = options;
		
		//base files
		var files = [
			{path: "js/lang.js", runat: "both"}, 
			{path: "js/event.js", runat: "both"}, 
			{path: "js/event.client.js", runat: "client"}, 
			{path: "js/fsm.js", runat: "both"},
			{path: "js/widget.js", runat: "both"},
			{path: "js/widget.server.js", runat: "server"},
			{path: "js/widget.client.js", runat: "client"},
			options.data.enabled ? {path: "js/data.js", runat: "both", runOnReady: true} : null,
			options.data.enabled ? {path: "js/data.server.js", runat: "server"} : null,
			options.data.enabled ? {path: "js/data." + options.data.provider.name + ".js", runat: "both", runOnReady: true} : null
		];
		
		//custom files requested by whoever called init()
		if (options.files) {
			for (var i = 0; i < options.files.length; i++) {
				files.push(options.files[i]);
			}
		}
		
		//files that need to be added to the front
		if (options.debug) {
			files.unshift({path: "js/debug.js",	runat: "server"});
		}
		files.unshift({path: "js/lib/extCore3.0/extCore3.0-adapter.js", runat: "both"});
		files.unshift({path: "js/lib/extCore3.0/ext-all.js", runat: "both"});
		
		//load away
		loadCoreFiles(files, options);
		
		//fire framework-level state machine loadingComplete event, which should put the framework in the ready state if all went well
		jojo.stateMachine.fire("loadingComplete");
	};
	
})();
