var assert = require("assert"),
    vows = require("vows"),
    sinon = require("sinon");

var api = new require("blogapi")();
var apiStub = new sinon.stub(api);

vows.describe('Blog API').addBatch({
    'when getting posts': {
        topic: function () { return apiStub.getPosts(); },

        'we get Infinity': function (topic) {
            assert.equal (topic, Infinity);
        }
    },
    'but when dividing zero by zero': {
        topic: function () { return 0 / 0 },

        'we get a value which': {
            'is not a number': function (topic) {
                assert.isNaN (topic);
            },
            'is not equal to itself': function (topic) {
                assert.notEqual (topic, topic);
            }
        }
    }
}).export(module);