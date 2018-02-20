var steem = require("steem");

var steemBlockTracker = require("./steemBlockTracker");

var userData = require("./userData.json");

var steemBroadcaster = require("./steemBroadcaster")
    .start(
        steem.auth.toWif(userData.name, userData.password, 'owner'),
        userData.name);

steem.api.setOptions({ url: 'https://api.steemit.com' });

////////////////////

// This is just a trick for better logging. Attach the datetime of each line.
((function improveLogging() {
    var log = console.log;
    var dir = console.dir;
    console.log = function (line) {
        log(new Date() + " : " + line);
    };
    console.dir = function (line) {
        dir(new Date() + " : " + line);
    };
})());

////////////////////

console.log("Starting to listen for comments mentioning: @" + userData.name + "...");

setInterval(() => {
    steemBlockTracker.readNewBlocks(userData.name, onNewMention, onAnyNewPost);
}, 10*1000);

function onNewMention(comment) {
    console.log("mention: @" + comment.author);
}

function onAnyNewPost(comment) {
    
}