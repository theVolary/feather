var dom = require('./jsdom/lib/level1/core').dom.level1.core;
var browser = require('./jsdom/lib/browser/index').windowAugmentation(dom);
exports.document = browser.document;
exports.window = browser.window;
exports.self = browser.self;
exports.navigator = browser.navigator;
exports.location = browser.location;

