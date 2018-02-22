var steem = require("steem");

var steemBlockTracker = require("./steemBlockTracker");

var userData = require("./userData.json");

var steemBroadcaster = require("./steemBroadcasterMock")
    .start(steem.auth.toWif(userData.name, userData.password, 'owner'), userData.name);

var postsFilter = require("./postsFilter");

////////////////////

steem.api.setOptions({ url: 'https://api.steemit.com' });

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
}, 60 * 60 * 1000);

////////////////////

console.log("Starting to listen for comments mentioning: @" + userData.name + "...");

setInterval(() => {
    steemBlockTracker.readNewBlocks(userData.name, onNewMention, onAnyNewPost);
}, 10 * 1000);

function onNewMention(comment) {
    console.log("mention: @" + comment.author);
}

function onAnyNewPost(comment) {
    postsFilter.filter(comment, function (comment, user, score) {
        setTimeout.call({ score: score, comment: comment, user: user }, () => {
            let points = (score.englishSpeechRatio * 1000).toFixed(2);
            var reputation = steem.formatter.reputation(user.reputation);

            console.log("[" + reputation + "] " + comment.timestamp + " - https://steemit.com/@" + comment.author + "/" + comment.permlink + " - " + points + " points");

            var replyText = "Hi. I am @greetbot - a bot that uses ***AI*** to look for newbies who write good content!" + "\n" +
                "Your post was approved by me. As reward it will be resteemed by a resteeming service." + "\n" +
                "![greetbot's stamp of approval](https://s10.postimg.org/3ksxxmpc9/stamp-250.png)" + "\n" +
                "> @greetbot evaluated your post's quality score as [" + points + "] points!" + "\n" +
                "Good Job!";

            steemBroadcaster.comment(comment.author, comment.permlink, replyText);
            steemBroadcaster.transfer("resteembot", 0.001, "STEEM", "https://steemit.com/@" + comment.author + "/" + comment.permlink);
        }, 1 * 60 * 1000);
    });
}