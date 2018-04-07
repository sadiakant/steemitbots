/**
 * https://steemit.com/@investigation
 */

var fs = require('fs');
var steem = require('steem');

///////////

var config = require("./config.json");
for (var key in config) {
	for (var i in config[key]) {
		config[key][i].wif = steem.auth.toWif(config.name, config.password, 'owner')
	}
}

var SECOND = 1000;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;

///////////

// URL taken from: https://developers.steem.io/
// If server is unreliable, select another URL
//		or run own node (2GB needed) as described in the linked docs
steem.api.setOptions({ url: 'https://gtg.steem.house:8090/' });

var STEEMITURL = "https://steemit.com/";
var LAST_RESTEEM_FILEPATH = "./lastResteemed.json";
var LAST_VOTED_FILEPATH = "./lastVoted.json";

var lastResteemed = require(LAST_RESTEEM_FILEPATH);
var lastVoted = require(LAST_VOTED_FILEPATH);

config.categotyResteem.forEach(function(bot){
	lastResteemed[bot.name + "_" + bot.category] = lastResteemed[bot.name + "_" + bot.category] || "01";
});

config.voteForPostsOf.forEach(function(bot){
	lastVoted[bot.name + "_" + bot.votePostsOf] = lastVoted[bot.name + "_" + bot.votePostsOf] || "01";
});

var resteemqueue = [];
var votequeue = [];

/////////////

// ## PLAYGROUND ## //

/////////////

setTimeout(function() {
	config.categotyResteem.forEach(function (bot) {
		resteemPostsWithTag(bot);
		setInterval(function () { resteemPostsWithTag(bot); }, 10 * MINUTE);
	});
}, 1*SECOND);

setTimeout(function() {
	config.voteForPostsOf.forEach(function (bot) {
		voteForPostsOfUser(bot);
		setInterval(function () { voteForPostsOfUser(bot); }, 60 * MINUTE);
	});
}, 5*SECOND);

setInterval(function () { resteemAPostsInTheQueue(); }, 3 * SECOND);
setInterval(function () { voteForAPostInTheQueue(); }, 6 * SECOND);

setInterval(function () { log("------------- [1 HOUR PASSED] -------------"); }, 1 * HOUR);

/////////////

function resteemPostsWithTag(bot) {
	log("Checking the '" + bot.category + "' tag...");
	var query = { limit: 100, tag: bot.category };
	steem.api.getDiscussionsByCreated(query, function (err, result) {
		if (err)
			return log(err);

		var newResult = result
			.sort(function(a,b){return a.created > b.created ? 1 : -1})
			.filter(function (r) { 
				return r.created > lastResteemed[bot.name + "_" + bot.category];
			});

		newResult.forEach(function (p) {
			resteemqueue.push({ bot: bot, author: p.author, permlink: p.permlink });
			setLastResteemed(bot, p.created);
		});

		log("Checked. " + newResult.length + " #" + bot.category + " posts found.");

	});
}

function voteForPostsOfUser(bot) {
	log("Checking for posts of @" + bot.votePostsOf + "...");
	steem.api.getState("/@" + bot.votePostsOf, function(err, result){

		var posts = Object.keys(result.content)
			.map(key=>result.content[key])
			.sort(function(a,b){return a.created > b.created ? 1 : -1})
			.filter(function (r) { return r.created > lastVoted[bot.name + "_" + bot.votePostsOf]; });

		 posts.forEach(function (p) {
			votequeue.push({ bot:bot, author: p.author, permlink: p.permlink, votingPower: bot.votingPower*100 });
			setLastVoted(bot, p.created);
		});

		log("Checked. " + posts.length + " @" + bot.votePostsOf + " posts found.");
	});
}

/////////////

function setLastResteemed(bot, lastIndex) {
	lastResteemed[bot.name + "_" + bot.category] = lastIndex;
	fs.writeFile(LAST_RESTEEM_FILEPATH, JSON.stringify(lastResteemed), function (err) {
		if (err)
			log(err);
	});
}

function setLastVoted(bot, lastIndex) {
	lastVoted[bot.name + "_" + bot.votePostsOf] = lastIndex;
	fs.writeFile(LAST_VOTED_FILEPATH, JSON.stringify(lastVoted), function (err) {
		if (err)
			log(err);
	});
}

/////////////

function voteForAPostInTheQueue() {
	if (votequeue.length < 1)
		return;

	var post = votequeue.shift();
	vote(post.bot, post.author, post.permlink, post.votingPower);
}

function resteemAPostsInTheQueue() {
	if (resteemqueue.length < 1)
		return;

	var post = resteemqueue.shift();
	resteemPost(post.bot, post.author, post.permlink);
}

function writeACommentInTheQueue() {
	if (commentqueue.length < 1)
		return;

	var post = commentqueue.shift();
	createComment(post.bot, post.author, post.permlink, post.body);
}

function sendTransactionFromQueue() {
	if (transactionqueue.length < 1)
		return;

	var transaction = transactionqueue.shift();
	makeTransaction(transaction.bot, transaction.to, transaction.amount, transaction.currency, transaction.memo);
}

/////////////

function vote(bot, author, permlink, votingPower) {
	steem.broadcast.vote(bot.wif, bot.name, author, permlink, votingPower, function (err, voteResult) {
		if (!err && voteResult) {
			log(bot.name + ": Voted " + (votingPower / 100) + "% : /" + author + "/" + permlink);
		} else {
			log(bot.name + ': Voting failure (' + author + '): ' + err.message.toString().substring(0,500));
		}
	});
}

function createComment(bot, author, permlink, body) {
	var commentPermlink = steem.formatter.commentPermlink(author, permlink);
	steem.broadcast.comment(bot.wif, author, permlink, bot.name, commentPermlink, "", body, "", function (err, result) {
		if (!err && result) {
			log(bot.name + ': Successful comment: [' + author + '] ' + permlink);
		} else {
			log(bot.name + ': Failed to create comment: ' + err.message.toString().substring(0,500));
		}
	});
}

function resteemPost(bot, author, permlink) {
	const json = JSON.stringify(['reblog', {
		account: bot.name,
		author: author,
		permlink: permlink
	}]);

	steem.broadcast.customJson(bot.wif, [], [bot.name], 'follow', json, function (err, result) {
		if (!err && result) {
			log(bot.name + ': Successful re-steem: [' + author + '] ' + permlink);
		} else {
			if (err.message.indexOf("Account has already reblogged this post") > -1)
				log(bot.name + ': Failed to re-steem [' + author + '] : Account has already reblogged this post');
			else
				log(bot.name + ': Failed to re-steem [' + author + '] : ' + err.message.toString().substring(0,500));

		}
	});
}

function makeTransaction(bot, to, amount, currency, memo) {
	steem.broadcast.transfer(bot.wif, bot.name, to, amount + " " + currency, memo, function (err, result) {
		if (!err && result) {
			log(bot.name + ": Successfull transaction from " + bot.name + " of " + amount + " " + currency + " to '" + to + "'");
		} else {
			console.log(bot.name + ": " + err.message.toString().substring(0,500));
		}
	});
}

///////////

var dateFormatOptions = { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
function log(str) { console.log(new Date().toLocaleTimeString("en-us", dateFormatOptions) + ":  ", str); }
