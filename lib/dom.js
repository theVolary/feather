var dom = require('./jsdom/lib/jsdom/level1/core').dom.level1.core;
var browser = require('./jsdom/lib/jsdom/browser/index').windowAugmentation(dom);
exports.document = browser.document;
exports.window = browser.window;
exports.self = browser.self;
exports.navigator = browser.navigator;
exports.location = browser.location;

