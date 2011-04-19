(function() {
var assert = require("assert"),
    sys = require("sys"),
    sinon = require("sinon"),
    cradle = require("cradle"),
    blogapi = require("blogapi").BlogApi,
    Y = YUITest = this.YUITest || require("yuitest");
var testEntries = {"total_rows":3,"offset":0,"rows":[
    {"id":"T07c6a417c9d30cbe8daff66d26f9adff","key":[2011,2,3,22,30,0],"value":{"pubDate":{},"summary":"Test: The feather Blog is Born","post":"Today the feather Blog was born.  Long may it live."}},
    {"id":"T3903aaa23008e1359b13911fc3d4d208","key":[2011,2,4,13,0,0],"value":{"pubDate":{},"summary":"Test: Getting Widgetized","post":"This morning I worked on turning the feather Blog into a fully widget-ized feather app."}},
    {"id":"T6f1b15dac400fa0b2448bb9ab84e3b15","key":[2011,2,4,15,0,0],"value":{"pubDate":{},"summary":"Test: Adding more entries","post":"Need to add six or more entries, so here's one more."}}
    ]};
    
var api = new blogapi();
var viewStub = new sinon.stub(feather.data.appdb.getRawDb(), "view", function() {
  if (arguments.length == 3) {
    arguments[2](null, new(cradle.Response)(testEntries, null));
  } else {
    return testEntries;
  }
});

var tc = new YUITest.TestCase({
  name: "when getting posts",
  
  setUp: function() {
  },
  tearDown: function() {
  },
  
  testStructure: function() {
    var test = this;
    
    api.getPosts(function(err, posts) {
      posts = posts.toArray();
      Y.Assert.isArray(posts, "Value should be an array, but is " + typeof(posts));
      Y.Assert.areEqual(3, posts.length, "Expected 3 posts, but got " + posts.length);
      Y.Assert.isNotUndefined(posts[0].key, "Expected a key property in the posts");
      Y.Assert.isNotUndefined(posts[0].pubDate, "Expected a pubDate property in the posts");
      Y.Assert.isTrue(posts[0].pubDate instanceof Date, "Expected pubDate to be a date property, but it is a " + typeof(posts[0].pubDate) + ": " + sys.inspect(posts[0].pubDate));
    });
  }
});
YUITest.TestRunner.add(tc);
/*
vows.describe('Blog API').addBatch({
    'when getting posts': {
        topic: function () { return apiStub.getPosts(); },

        'we get an array back': function (topic) {
          assert.isArray(topic);
        },
        'the length of the test results should be 3': function(topic) {
          assert.length(topic, 3);
        },
        'the items should have a key property': function(topic) {
          assert.include(topic[0], 'key');
        },
        'the items should have a pubDate property': function(topic) {
          assert.include(topic[0], 'pubDate');
        },
        'the pubDate property should be a Date object': function(topic) {
          assert.typeOf(topic[0].pubDate, 'date');
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
*/
})();