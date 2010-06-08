var dom = require('./jsdom/lib/level1/core').dom.level1.core;
var browser = require('./jsdom/lib/browser/index').windowAugmentation(dom);
global.document = browser.document;
global.window = browser.window;
global.self = browser.self;
global.navigator = browser.navigator;
global.location = browser.location;

