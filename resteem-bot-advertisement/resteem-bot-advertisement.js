/**
 * https://steemit.com/@investigation
 */

var userData = require("./userData.json");

var MINUTES_BETWEEN_NEW_POST_SEARCH = 30;

var VOTING_POWER_PERCENTAGE = 100; // in percentage (%)

/////////////

var MIN_ADVERTISMENT_REPUTATION = 20,
	MAX_ADVERTISMENT_REPUTATION = 45;

var MIN_POST_SIZE = 500;

var URL_TO_INTRODUCTION_POST = "https://steemit.com/resteembot/@resteembot/how-to-use-resteembot";
var URL_TO_VOLUNTEER_POST = "https://steemit.com/resteembot/@resteembot/how-to-help-resteem-bot-spread-the-word";

var ADVERTISMENT_COMENT = "Hi. I am a volunteer bot for @resteembot that upvoted you.\n" +
	"Your post was chosen at random, as part of the advertisment campaign for @resteembot.\n" +
	"@resteembot is meant to help minnows get noticed by re-steeming their posts\n" +
	"-----\n" +
	"To use the bot, one must follow it for at least 3 hours, and then make a transaction where the memo is the url of the post.\n" +
	"If you want to learn more - [read the introduction post of @resteembot](" + URL_TO_INTRODUCTION_POST + ").\n" +
	"If you want help spread the word - [read the advertisment program post](" + URL_TO_VOLUNTEER_POST + ").\n" +
	"-----\n" +
	"Steem ON!";

/////////////

var steem = require('steem');

var steemitWSS = "wss://steemd-int.steemit.com"
steem.api.setOptions({ url: steemitWSS });

var SECOND = 1000;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;

var STEEMITURL = "https://steemit.com";

var VOTING_POWER = VOTING_POWER_PERCENTAGE * 100;

var botUser = initUser(userData);

var checkForPostsSince = ""

var votequeue = [];
var commentqueue = [];

/////////////
var delay = (Math.random() * 30) | 0;
log("The bot will start in [" + delay + "] minutes")
setTimeout(function() {
	lookForNewPosts();
	setInterval(function () { lookForNewPosts(); }, MINUTES_BETWEEN_NEW_POST_SEARCH * MINUTE);
}, delay * MINUTE);

setInterval(function () { voteForAPostInTheQueue(botUser); }, 10 * SECOND);

setInterval(function () { writeACommentInTheQueue(botUser); }, 40 * SECOND);

/////////////

function lookForNewPosts() {

	steem.api.getDiscussionsByCreated({ "limit": 15 }, function (err, results) {
		if (err === null) {
			results = results.reverse();
			var userNames = results.map(function (r) { return r.author; });
			steem.api.getAccounts(userNames, function (e, users) {
				for (var u in users) {
					var user = users[u];
					var post = results[userNames.indexOf(user.name)];
					var reputation = steem.formatter.reputation(user.reputation);

					if (post.created <= checkForPostsSince)  
						continue; 

					if (post.body.length < MIN_POST_SIZE) 
						 continue; 

					if (MIN_ADVERTISMENT_REPUTATION <= reputation && reputation <= MAX_ADVERTISMENT_REPUTATION) 
					{
						votequeue.push({ author: user.name, permlink: post.permlink, votingPower: VOTING_POWER });
						commentqueue.push({ author: user.name, permlink: post.permlink, body: ADVERTISMENT_COMENT });
						log("Noticed post of " + user.name + "[" + reputation + "] ==> " + STEEMITURL + post.url);
						checkForPostsSince = post.created;
					}
				}
			});
		} else {
			log(err);
		}
	});
}

/////////////

function voteForAPostInTheQueue(ownUser) {
	if (votequeue.length < 1)
		return;

	var post = votequeue.shift();
	vote(ownUser, post.author, post.permlink, post.votingPower);
}

function writeACommentInTheQueue(ownUser) {
	if (commentqueue.length < 1)
		return;

	var post = commentqueue.shift();
	createComment(ownUser, post.author, post.permlink, post.body);
}

/////////////

function initUser(ownUser) {
	var user = {
		wif: steem.auth.toWif(ownUser.name, ownUser.password, 'posting'),
		name: ownUser.name
	};

	if (user.wif == undefined || user.wif == null)
		throw new Error("Failed to initialize user!");

	return user;
}

function vote(ownUser, author, permlink, votingPower) {
	steem.broadcast.vote(ownUser.wif, ownUser.name, author, permlink, votingPower, function (err, voteResult) {
		if (!err && voteResult) {
			log(ownUser.name + " voted " + (votingPower / 100) + "% : /" + author + "/" + permlink);
		} else {
			log('Voting failure (' + author + '): ' + err);
		}
	});
}

function createComment(ownUser, author, permlink, body) {
	var commentPermlink = steem.formatter.commentPermlink(author, permlink);
	steem.broadcast.comment(ownUser.wif, author, permlink, ownUser.name, commentPermlink, "", body, "", function (err, result) {
		if (!err && result) {
			log('Successful comment: [' + author + '] ' + permlink);
		} else {
			log('Failed to create comment: ' + err);
		}
	});
}

/////////////

var dateFormatOptions = { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
function log(str) { console.log(new Date().toLocaleTimeString("en-us", dateFormatOptions) + ":  ", str); }