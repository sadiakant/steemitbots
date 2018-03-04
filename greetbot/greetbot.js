var steem = require("steem");
var fs = require("fs");

var steemBlockTracker = require("./steemBlockTracker");

var userData = require("./userData.json");

var steemBroadcaster = require("./steemBroadcasterMock")
    .start(steem.auth.toWif(userData.name, userData.password, 'owner'), userData.name);

var postsFilter = require("./postsFilter");

var englishEvaluater = require("./englishEvaluater");

var steemApiUtils = require("./steemApiUtils");

////////////////////

steem.api.setOptions({ url: 'https://api.steemit.com' });

var HOUR = 60 * 60 * 1000;
var REWARDQUEUE_PATH = "./rewardqueue.json";

var rewardqueue = require(REWARDQUEUE_PATH);

////////////////////

// This is just a trick for better logging. Attach the datetime of each line.
((function improveLogging() {
    var log = console.log;
    var dir = console.dir;
    console.log = function () {
        var args = [];
        for (var i = 0; i < arguments.length; i++)
            args.push(arguments[i])
        log(new Date() + " : ", args.join(", "));
    };
    console.dir = function () {
        var args = [];
        for (var i = 0; i < arguments.length; i++)
            args.push(arguments[i])
        dir(new Date() + " : ", args.join(", "));
    };
})());

setInterval(function () {
    console.log("------------- [1 HOUR PASSED] -------------");
}, HOUR);

////////////////////

var CHECK_H = 4;

console.log("Starting to listen for comments mentioning: @" + userData.name + "...");

setInterval(() => { steemBlockTracker.readNewBlocks(userData.name, onNewMention); }, 60 * 1000);

setInterval(() => { rewardAPostFromQueue(rewardqueue); }, 0.0015 * 60 * 1000);

setTimeout(function() {
    console.log("Starting check for posts to reward...");
    rewardYesterdaysGoodWriters(new Date - (48 * HOUR), new Date() - ((48-CHECK_H) * HOUR));
    setInterval(() => { 
        console.log("Starting check for posts to reward...");
        rewardYesterdaysGoodWriters(new Date - (48 * HOUR), new Date() - ((48-CHECK_H) * HOUR)); 
    }, CHECK_H * HOUR);    
}, 10);// getMillisecondsTill(10,20));

setInterval(() => {
    setTimeout(function() {
        rewardqueue = rewardqueue.slice(0, 10); 
    }, (CHECK_H - 1) * HOUR);
}, 4 * CHECK_H * HOUR);

function onNewMention(comment) {
    var postedByBot = comment.author == userData.name;
    console.log("mention: @" + comment.author + (postedByBot ? "": "/" + comment.permlink));
    if(postedByBot)
        return;

    steemApiUtils.getRootPost(comment, function (root) {
        if(root.body.length > 3000){
            var score = englishEvaluater.isTextInEnglish(root.body);
            var points = (score.englishSpeechRatio * 1000).toFixed(2);
            var message = "Greetings from @greetbot.\n" +
                "This discussion scorred [" + points + "] points on my scale.\n" + 
                (score.englishSpeechRatio > 0.4
                    ? "![greetbot's stamp of approval](https://s10.postimg.org/3ksxxmpc9/stamp-250.png)"
                    : "");
            steemBroadcaster.comment(comment.author, comment.permlink, message);
        } else {
            steemBroadcaster.comment(comment.author, comment.permlink,"Greetings from @greetbot.\n" +
                "Unfortunately, I can not evaluate posts of this size.\n" +
                "Please use the bot on bigger posts");
        }
    });
}

function rewardYesterdaysGoodWriters(from, to) {
    steemBlockTracker.getRootCommentsBetween(from, to, postsFilter.simpleFilter, function (posts) {
        console.log("Finished scanning for posts written yesterday");
        console.log("Total post count : " + posts.length);
        postsFilter.complexFilter(posts, function (approvedPosts) {

            approvedPosts = approvedPosts.map(p => {
                return {
                    author: p.author,
                    permlink: p.permlink,
                    scorePoints: englishEvaluater.isTextInEnglish(p.body).englishSpeechRatio,
                };
            });

            rewardqueue = approvedPosts.concat(rewardqueue)
                .sort((a, b) => b.scorePoints - a.scorePoints)
                .slice(0, 50);
            
            console.log("New posts added to reward queue. " + rewardqueue.length + " posts waiting to be rewarded.");
            console.log("------------------");
        });
    });
}

function rewardAPostFromQueue(rewardqueue) {
    if (rewardqueue.length < 1)
        return;

    var post = rewardqueue.shift();
    fs.writeFileSync(REWARDQUEUE_PATH, JSON.stringify(rewardqueue));

    var points = (post.scorePoints * 1000).toFixed(2);

    console.log("Rewarding post : https://steemit.com/@" + post.author + "/" + post.permlink + " - " + points + " points");

    var replyText = "Hi. I am a bot that looks for newbies who write good content!\n" +
        "I also write bots for other people.\n" +
        "Your post passed all of my tests.\n" +
        "> @greetbot evaluated your post's quality score at [" + points + "] points!\n" +
        "### You get:\n" +
        " - @greetbot's stamp of approval\n" +
        " - A free resteem from @resteembot\n" +
        " - An invitation to the [PAL Discord](https://discord.gg/GUuCXgY) - they give free upvotes\n" +
        "--------\n" +
        "![greetbot's stamp of approval](https://s10.postimg.org/3ksxxmpc9/stamp-250.png)";

    steemBroadcaster.comment(post.author, post.permlink, replyText);
    steemBroadcaster.transfer("resteembot", 0.001, "STEEM", "https://steemit.com/@" + post.author + "/" + post.permlink);

}

function getMillisecondsTill(h, m, s) {
	var d = new Date();
	d.setHours(h || 0);s
	d.setMinutes(m || 0);
	d.setSeconds(s || 0);

	var msTo12 = d - new Date();
	if (msTo12 < 0)
		msTo12 += 24 * HOUR

	return msTo12;
}