/**
 * https://steemit.com/@investigation
 */

///////////

var config = require("./config.json")

var SECOND = 1000;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;

///////////

var fs = require('fs');
var steem = require('steem');

steem.api.setOptions({ url: 'https://api.steemit.com' });

var STEEMITURL = "https://steemit.com/";
var LAST_RESTEEM_FILEPATH = "./lastResteemed.json";

var bots = config.map(function (c) { return initUser(c); });

var lastResteemed = require(LAST_RESTEEM_FILEPATH);

var resteemqueue = [];

/////////////

// ## PLAYGROUND ## //

/////////////

bots.forEach(function (bot) {
	checkForNewPosts(bot);
	setInterval(function () { checkForNewPosts(bot); }, 30 * SECOND);
});

setInterval(function () { resteemAPostsInTheQueue(); }, 1 * SECOND);

setInterval(function () { log("------------- [1 HOUR PASSED] -------------"); }, 1 * HOUR);

/////////////

function checkForNewPosts(bot) {
	console.log("Checking the '" + bot.category + "' tag...");
	var query = { limit: 100, tag: bot.category };
	steem.api.getDiscussionsByCreated(query, function (err, result) {
		if (err)
			return log(err);

		var newResult = result.sort((i1, i2) => i1 - 2)
			.filter(function (r) { return r.created > lastResteemed[bot.category] });

		newResult.forEach(function (p) {
			resteemqueue.push({ bot: bot, author: p.author, permlink: p.permlink });
			setLastResteemed(bot.category, p.created);
		});

		console.log("Checked. " + newResult.length + " #" + bot.category + " found.");

	});
}

function setLastResteemed(category, lastIndex) {
	lastResteemed[category] = lastIndex;
	fs.writeFile(LAST_RESTEEM_FILEPATH, JSON.stringify(lastResteemed), function (err) {
		if (err)
			log(err);
	});
}

/////////////

function resteemAPostsInTheQueue() {
	if (resteemqueue.length < 1)
		return;

	var post = resteemqueue.shift(); 10
	resteemPost(post.bot, post.author, post.permlink);
}


/////////////

function initUser(config) {
	log("Logging in as @" + config.name + "...");

	var user = {
		wif: steem.auth.toWif(config.name, config.password, 'owner'),
		name: config.name,
		category: config.category
	};

	log("Logged in!");

	if (user.wif == undefined)
		throw new Error("'wif' is undefined");

	return user;
}

function resteemPost(bot, author, permlink) {
	const json = JSON.stringify(['reblog', {
		account: bot.name,
		author: author,
		permlink: permlink
	}]);

	steem.broadcast.customJson(bot.wif, [], [bot.name], 'follow', json, function (err, result) {
		if (!err && result) {
			log('@' + bot.name + ' Successful re-steem: [' + author + '] ' + permlink);
		} else {
			if (err.message.indexOf("Account has already reblogged this post") > -1)
				log('@' + bot.name + ' failed to re-steem [' + author + '] : Account has already reblogged this post');
			else
				log('@' + bot.name + ' failed to re-steem [' + author + '] : ' + err);

		}
	});
}

///////////

var dateFormatOptions = { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
function log(str) { console.log(new Date().toLocaleTimeString("en-us", dateFormatOptions) + ":  ", str); }
