
var steem = require("steem");
steem.api.setOptions({ url: 'https://api.steemit.com' });

var steemBlockTracker  = require("./steemBlockTracker");
var postsFilter  = require("./postsFilter");
var englishEvaluater  = require("./englishEvaluater");

var HOUR = 60*60*1000;
rewardYesterdaysGoodWriters(new Date - (48 * HOUR), new Date() - ((48 - 4) * HOUR));

function rewardYesterdaysGoodWriters(from, to) {
    steemBlockTracker.getRootCommentsBetween(from, to, postsFilter.simpleFilter, function (posts) {
        var postsByLink = {};
        posts.forEach(function(p) {
            var k = p.author + " | " + p.permlink;
            postsByLink[k] = postsByLink[k] || [];
            postsByLink[k].push(p);
        }, this);

        repeatedPostsByLink = {};
        Object.keys(postsByLink)
            .filter(k => postsByLink[k].length > 1)
            .sort((a,b) => postsByLink[a].length > postsByLink[b].length)
            .forEach(k => repeatedPostsByLink[k] = postsByLink[k]);

        console.dir(Object.keys(repeatedPostsByLink));
    });
}