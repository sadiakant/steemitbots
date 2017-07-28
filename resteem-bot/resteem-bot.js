/**
 * https://steemit.com/@investigation
 */

/////////////

var MIN_REPUTATION = 15,
	NEWBIE_PROMOTION_MAX_REPUTATION = 28;

var botUserData = { name: "resteembot", password: "<SECRET>" };


var MIN_ADVERTISMENT_REPUTATION = 15,
	MAX_ADVERTISMENT_REPUTATION = 45;

var URL_TO_INTRODUCTION_POST = "https://steemit.com/resteembot/@resteembot/resteem-bot-introduction";

var ADVERTISMENT_COMENT = "Hi. I am a bot that upvoted you.\n" +
	"Your post was chosen at random, as part of my advertisment campaign.\n" +
	"I can also re-steem and upvote some of your other posts\n" +
	"If you want to read more - [read the introduction post](" + URL_TO_INTRODUCTION_POST + ").\n" +
	"\n----\n" +
	"PS: If your reputation is lower than " + NEWBIE_PROMOTION_MAX_REPUTATION + " re-blogging only costs 0.001 SBD"

var RESTEEM_UPVOTE_COMMENT = "This post was resteemed by @" + botUserData.name + "!\n" +
	"Good Luck!\n" +
	"----\n" +
	"Learn more about the @resteembot project [in the introduction post](" + URL_TO_INTRODUCTION_POST + ").\n" +
	"----";

var UPVOTE_COMMENT = "This post was upvoted by @" + botUserData.name + "!\n" +
	"Good Luck!\n" +
	"----\n" +
	"Learn more about the @resteembot project [in the introduction post](" + URL_TO_INTRODUCTION_POST + ").\n" +
	"----";

/////////////

var fs = require('fs');
var steem = require('steem');

var SECOND = 1000;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;
var MUST_FOLLOW_SINCE_HOURS = 2 * HOUR;

var STEEMITURL = "https://steemit.com/";
var LAST_TRANSACTION_FILEPATH = "./lastHandledTransaction.json";
var FOLLOWERS_FILEPATH = "./followers.json";

var botUser = initUser(botUserData);

var checkForPostsSince = ""
var lastHandledTransaction = require(LAST_TRANSACTION_FILEPATH).index;

var votequeue = [];
var resteemqueue = [];
var commentqueue = [];
var transactionmemosqueue = [];

var followers = require(FOLLOWERS_FILEPATH);

/////////////

// ## PLAYGROUND ## //

/////////////

// lookForNewPosts();
// setInterval(function () { lookForNewPosts(); }, 8 * HOUR);

updateFollowerList();
setInterval(function () { updateFollowerList(); }, MUST_FOLLOW_SINCE_HOURS);

checkForNewTransactions();
setInterval(function () { checkForNewTransactions() }, 10 * SECOND);

setInterval(function () { resteemAPostsInTheQueue(botUser); }, 1 * SECOND);

setInterval(function () { voteForAPostInTheQueue(botUser); }, 10 * SECOND);

setInterval(function () { logTransactionMemoFromQueue(botUser); }, 10 * SECOND);

setInterval(function () { writeACommentInTheQueue(botUser); }, 40 * SECOND);

/////////////

function checkShouldStop() { return !fs.existsSync("./DontStop"); }

function checkForNewTransactions() {
	if (checkShouldStop()) {
		log("The 'DontStop' file is missing. The program is in ShutDown process.")
		return; // don't handle more transactions, so that the ques will be empty.
	}

	steem.api.getAccountHistory(botUser.name, 99999999, 1000, function (err, accountHistory) {

		var detectedTransactions = 0;
		var newItems = 0;

		for (var i in accountHistory) {

			var doResteem = false;
			var doUpvote = false;

			if (accountHistory[i][0] <= lastHandledTransaction) continue;
			else newItems++

			transaction = parseAsTransaction(accountHistory[i]);
			if (transaction === null || transaction === undefined) continue;

			var follower = followers[transaction.author];
			if (follower === undefined || follower === null)
			{ 
				logPublically(transaction.author + " is not a follower");
				continue;
			}

			if (follower.reputation < MIN_REPUTATION) 
			{ 
				logPublically(transaction.author + " has too low reputation : " + follower.reputation);
				continue;
			}

			if (follower.reputation <= NEWBIE_PROMOTION_MAX_REPUTATION || // super small minnows don't have to pay more than 0.001
				transaction.amount < follower.reputation * 0.001 * 0.9) // Min price = reputation/1000. Example: (45 * 0.001 = 0.045)
			{
				logPublically(transaction.author + " paid " + transaction.amountStr
					+ " but the price for " + follower.reputation + " reputation is " + (follower.reputation * 0.001));
				continue;
			}

			detectedTransactions++;
			log("Transaction detected: " + transaction.from + " payed [" + transaction.amountStr + "] with memo " + transaction.memo);
			resteemqueue.push({ author: transaction.author, permlink: transaction.permlink, transactionIndex: transaction.index });
			commentqueue.push({ author: transaction.author, permlink: transaction.permlink, body: RESTEEM_UPVOTE_COMMENT });
			logPublically(transaction.author + "'s post will be resteemed.");
			
			
			setLastHandledTransaction(transaction.index);
		}

		if (newItems > 0 && detectedTransactions === 0)
			setLastHandledTransaction(accountHistory[accountHistory.length - 1][0]);
	});
}

function logPublically(memo){
	transactionmemosqueue.push(memo);
	log(memo);
}

function updateFollowerList(lastFollowerUsername) {

	if (lastFollowerUsername === null || lastFollowerUsername === undefined)
		lastFollowerUsername = null;

	var followerBatchSize = 1000
	steem.api.getFollowers(botUserData.name, lastFollowerUsername, "blog", followerBatchSize, function (err, result) {
		if (err === null) {
			var names = result.map(function (f) { return f.follower; });
			if (lastFollowerUsername === names[0])
				names.splice(0, 1);

			log("Refreshing Followers : found " + names.length);
			//log(names);

			steem.api.getAccounts(names, function (e, users) {
				if (err === null) {
					for (var i = 0; i < users.length; i++) {
						var user = users[i];
						var reputation = steem.formatter.reputation(user.reputation);

						followers[user.name] = { reputation: reputation };
					}
				} else {
					log(err);
				}
			});

			if (result.length == followerBatchSize)
				updateFollowerList(names[names.length - 1]);
			else {
				setTimeout(function () { saveFollowerList(); }, 20 * SECOND)
			}

		} else {
			log(err);
		}
	});
}

function setLastHandledTransaction(index) {
	if(lastHandledTransaction >= index)
		return;

	lastHandledTransaction = index;
	fs.writeFile(LAST_TRANSACTION_FILEPATH, JSON.stringify({ index: index }), function (err) {
		if (err) {
			log(err);
		} else {
			log("Last interaction index (" + index + ") saved to " + LAST_TRANSACTION_FILEPATH);
		}
	});
}

function saveFollowerList() {
	fs.writeFile(FOLLOWERS_FILEPATH, JSON.stringify(followers), function (err) {
		if (err) {
			log(err);
		} else {
			log("Follower List saved to " + FOLLOWERS_FILEPATH);
		}
	});
}

function parseAsTransaction(historyItem) {

	var stringified = JSON.stringify(historyItem);
	if (stringified.indexOf('","op":["transfer",{"from":"') == -1)
		return null;

	var transaction = historyItem[1].op[1];
	transaction.index = historyItem[0];
	transaction.timestamp = historyItem[1].timestamp;
	transaction.type = historyItem[1].op[0];

	if (transaction.from === botUser.name)
		return null;

	var transactionString = transaction.from + " [" + transaction.amount + "] - '" + transaction.memo + "'";

	try {
		var urlIndex = transaction.memo.indexOf(STEEMITURL);
		if (urlIndex == -1) {
			logPublically(transaction.from + "'s memo doesn't contain a SteemIt link (" + transaction.memo + ")");
			return null;
		}

		var memo = transaction.memo.trim();
		var authorAndPermlink = memo.substring(memo.indexOf('/@') + 2)
		transaction.author = authorAndPermlink.split('/')[0];
		transaction.permlink = authorAndPermlink.substring(transaction.author.length + 1);
	}
	catch (ex) {
		logPublically(transaction.from + "'s memo couldn't be parsed (" + transaction.memo + ")");
		return null;
	}

	try {
		transaction.amountStr = transaction.amount;
		transaction.currency = transaction.amount.split(' ')[1];
		transaction.amount = parseFloat(transaction.amount.split(' ')[0]);
	}
	catch (ex) {
		log("Failed to parse transaction amount: " + transactionString + "\t : \t" + ex);
		return null;
	}

	log(transactionString)
	return transaction;
}

function lookForNewPosts() {
	if (checkShouldStop()) {
		log("The 'DontStop' file is missing. The program is in ShutDown process.")
		return; // don't handle more transactions, so that the ques will be empty.
	}

	steem.api.getDiscussionsByCreated({ "limit": 5 }, function (err, results) {
		if (err === null) {
			results = results.reverse();
			var userNames = results.map(function (r) { return r.author; });
			steem.api.getAccounts(userNames, function (e, users) {
				for (var u in users) {
					var user = users[u];
					var post = results[userNames.indexOf(user.name)];
					var reputation = steem.formatter.reputation(user.reputation);
					if (post.created <= checkForPostsSince) { continue; }
					if (MIN_REPUTATION <= reputation && reputation <= MAX_REPUTATION) {
						votequeue.push({ author: user.name, permlink: post.permlink, votingPower: 10000 });
						commentqueue.push({ author: user.name, permlink: post.permlink, body: ADVERTISMENT_COMENT });
						log("Noticed post of " + user.name + "[" + reputation + "] ==> " + post.url);
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

function resteemAPostsInTheQueue(ownUser) {
	if (resteemqueue.length < 1)
		return;

	var post = resteemqueue.shift();
	resteemPost(ownUser, post.author, post.permlink);

	setLastHandledTransaction(post.transactionIndex);
}

function writeACommentInTheQueue(ownUser) {
	if (commentqueue.length < 1)
		return;

	var post = commentqueue.shift();
	createComment(ownUser, post.author, post.permlink, post.body);
}

function logTransactionMemoFromQueue(ownUser) {
	if (transactionmemosqueue.length < 1)
		return;

	var memo = transactionmemosqueue.shift();
	logViaTransaction(ownUser, memo);
}

/////////////

function initUser(ownUser) {
	var user = {
		wif: steem.auth.toWif(ownUser.name, ownUser.password, 'owner'),
		name: ownUser.name
	};

	if (user.wif == undefined)
		throw new Error("'wif' is undefined");

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

function resteemPost(ownUser, author, permlink) {
	const json = JSON.stringify(['reblog', {
		account: ownUser.name,
		author: author,
		permlink: permlink
	}]);

	steem.broadcast.customJson(ownUser.wif, [], [ownUser.name], 'follow', json, (err, result) => {
		if (!err && result) {
			log('Successful re-steem: [' + author + '] ' + permlink);
		} else {
			log('Failed to re-steem: ' + err);
		}
	});
}

function makeTransaction(ownUser, to, ammount, currency, memo){
    steem.broadcast.transfer(ownUser.wif, ownUser.name, to, ammount +" "+ currency, memo, function(err, result) {
        if(!err && result) {
            log("Successfull transaction from " + ownUser.name + " of " + ammount + " " + currency + " to '" + to + "'");
        } else{
            console.log(err.message);
        }
    });
}

function logViaTransaction(ownUser, memo){
    steem.broadcast.transfer(ownUser.wif, ownUser.name, ownUser.name, "0.001 SBD", memo, function(err, result) {
        if(err) {
            console.log(err.message);
        }
    });
}

/////////////

var dateFormatOptions = { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
function log(str) { console.log(new Date().toLocaleTimeString("en-us", dateFormatOptions) + ":  ", str); }