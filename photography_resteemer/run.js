/**
	Created by https://steemit.com/@investigation

	Copyright (c) 2018 ALEXANDER DINKOV <alexander.n.dinkov@gmail.com>

	Permission to use, copy, modify, and distribute this software for any
	purpose with or without fee is hereby granted, provided that the above
	copyright notice and this permission notice appear in all copies.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
	WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
	ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
	WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
	ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
	OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
	
 */

/////////////

var MIN_REPUTATION = 15,
	NEWBIE_PROMOTION_MAX_REPUTATION = 33;

var botUserData = require("./userData.json");

var URL_TO_INTRODUCTION_POST = "https://steemit.com/@rephoto";

var URL_TO_LOGO = "some-small-image-url";

var RESTEEM_COMMENT = `Your post has been resteemed by @` + botUserData.name + `! 
[resteemedby]
Good luck! 
@` + botUserData.name + ` shares undervalued photography work with the steemit community
Follow @` + botUserData.name + ` and read the [introduction post](` + URL_TO_INTRODUCTION_POST + `) to find out more!`;

var RESTEEMED_THANKS_TO = "The resteem was paid by @[resteemedby]\n";

var WINNER_COMMENT = `Congratulation's! 
Your post was randomly selected for an upvote from @` + botUserData.name + `! 
Read the [introduction post](` + URL_TO_INTRODUCTION_POST + `) to find out more!
[logo](` + URL_TO_LOGO + `)`;

var WINNER_MEMO = "A post of yours was randomly upvoted by @" + botUserData.name
	+ ". Thank you for using the bot.";

var WINNER_VOTING_POWER = 10000;

/////////////

var fs = require('fs');
var steem = require('steem');

// URL taken from: https://developers.steem.io/
// If server is unreliable, select another URL
//		or run own node (2GB needed) as described in the linked docs
steem.api.setOptions({ url: 'https://gtg.steem.house:8090/' });

var SECOND = 1000;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;
var MUST_FOLLOW_SINCE_HOURS = 90 * MINUTE;

var ownedBy = "youareyourowngod";
var MIN_RETRIVABLE_AMOUNT = 5.02;
var MIN_LEFTOVER_BALANCE = 0.02;

var STEEMITURL = "https://steemit.com/";
var LAST_TRANSACTION_FILEPATH = "./lastHandledTransaction.json";
var FOLLOWERS_FILEPATH = "./followers.json";

var botUser = initUser(botUserData);

var checkForPostsSince = "";
var lastHandledTransaction = require(LAST_TRANSACTION_FILEPATH).index;

var countOfResteemsIn24Hours = 150;
var dailyUpvoteCount = 10;

var allowedTags = ["photography"];

var votequeue = [];
var resteemqueue = [];
var commentqueue = [];
var transactionmemosqueue = [];
var transactionqueue = [];

var followers = require(FOLLOWERS_FILEPATH);

/////////////

// ## PLAYGROUND ## //

/////////////

updateFollowerList();
setInterval(function () { updateFollowerList(); }, MUST_FOLLOW_SINCE_HOURS);

setInterval(function () { checkForNewTransactions(); }, 30 * SECOND);

setInterval(function () { resteemAPostsInTheQueue(botUser); }, 1 * SECOND);

setInterval(function () { voteForAPostInTheQueue(botUser); }, 10 * SECOND);

setInterval(function () { logTransactionMemoFromQueue(botUser); }, 10 * SECOND);

setInterval(function () { sendTransactionFromQueue(botUser); }, 10 * SECOND);

setInterval(function () { writeACommentInTheQueue(botUser); }, 40 * SECOND);

tryRetreiveEarnings(botUser, ownedBy);
setInterval(function () { tryRetreiveEarnings(botUser, ownedBy); }, 1 * HOUR);

setTimeout(function () {
	countResteemsIn24Hours();
	setInterval(function () { countResteemsIn24Hours(); }, 1 * HOUR);
}, getMillisecondsTill12());

setInterval(function () { log("------------- [1 HOUR PASSED] -------------"); }, 1 * HOUR);

/////////////

function checkShouldStop() { return !fs.existsSync("./DontStop"); }


function checkForNewTransactions() {
	if (checkShouldStop()) {
		log("The 'DontStop' file is missing. The program is in ShutDown process.")
		return; // don't handle more transactions, so that the ques will be empty.
	}

	steem.api.getAccountHistory(botUser.name, 99999999, 1000, function (err, accountHistory) {

		if (err) { log(err); return; }

		var i = accountHistory.length - 1;
		var lastIndex = accountHistory[i][1].timestamp
			+ "#" + accountHistory[i][1].block
			+ "#" + accountHistory[i][0];

		for (var i in accountHistory) {

			var doResteem = false;
			var doUpvote = false;

			var index = accountHistory[i][1].timestamp
				+ "#" + accountHistory[i][1].block
				+ "#" + accountHistory[i][0];
			if (index <= lastHandledTransaction) continue;

			readTransaction(parseAsTransaction(accountHistory[i]));

			setLastHandledTransaction(index);
		}
		if (lastHandledTransaction != lastIndex)
		setLastHandledTransaction(lastIndex);
	});
}

function readTransaction(transaction) {

	if (transaction === null || transaction === undefined) {
		return;
	}

	var follower = followers[transaction.from];
	if (follower === undefined || follower === null) {
		logPublically(transaction.from + " is not a follower, or 2 hours haven't passed since following",
			transaction.from, transaction.amountStr, transaction.currency);
		return;
	}

	var isNewbie = follower.reputation <= NEWBIE_PROMOTION_MAX_REPUTATION;
	var resteemsOwnPost = transaction.from === transaction.author;

	if (follower.reputation < MIN_REPUTATION) {
		logPublically(transaction.author + " has too low reputation : " + follower.reputation + 
			". Minimum is " + MIN_REPUTATION, transaction.from);
		return;
	}

	if (isNewbie && resteemsOwnPost) // super small minnows don't have to pay more than 0.001
	{
		log(transaction.author + " used the newbie promotion");
	}
	else if (transaction.amount < follower.reputation * 0.001 * 0.9) // Min price = reputation/1000. Example: (45 * 0.001 = 0.045)
	{
		var message = transaction.from + " paid " + transaction.amountStrFull
			+ " but the price for " + follower.reputation + " reputation is "
			+ (follower.reputation * 0.001).toFixed(3);

		if (isNewbie && !resteemsOwnPost)
			message += " (Keep in mind that the cheap newbie price is only for resteeming your own content)"

		logPublically(message, transaction.from, transaction.amountStr, transaction.currency);
		return;
	}

	_self_snapshot = {
		transaction:transaction,
		resteemsOwnPost:resteemsOwnPost,
	}
	
	getTags.call(_self_snapshot, transaction.author, transaction.permlink, function (err, tags) {
		if (err || allowedTags.every(t1 => tags.every(t2 => t1 != t2))) {

			logPublically(
				transaction.from + ", " + botUser.name + " is a photography service. Please include the photography tag to resteem your post",
				transaction.from, transaction.amountStr, transaction.currency);
		}
		else {
			log("Transaction detected: " + transaction.from + " payed [" + transaction.amountStrFull + "] with memo " + transaction.memo);

			var resteemedThanksTo = RESTEEMED_THANKS_TO.replace("[resteemedby]", transaction.from);
			resteemedThanksTo = (resteemsOwnPost ? "" : resteemedThanksTo);

			resteemqueue.push({ author: transaction.author, permlink: transaction.permlink });
			commentqueue.push({
				author: transaction.author,
				permlink: transaction.permlink,
				body: RESTEEM_COMMENT.replace("[resteemedby]", resteemedThanksTo)
			});
			checkIfPostIsLuckyEnoughToBeUpvoted(transaction);

			if (transaction.from === "greetbot") {
				logPublically("refunding", transaction.from,
					transaction.amountStr, transaction.currency);
			}
		}
	});


}

function getTags(username, permlink, callback) {
	steem.api.getState("/@" + username, function (err, result) {
		try {
			var tags = JSON.parse(result.content[username + '/' + permlink].json_metadata).tags;
			callback(undefined, tags);
		} catch (error) {
			callback(error);
		}
	});
}

function logPublically(memo, to, amount, currency) {
	amount = amount || "0.001";
	currency = currency || "SBD";

	log(memo);

	if (to === undefined || to == null)
		transactionmemosqueue.push(memo);
	else
		transactionqueue.push({ to: to, amount: amount, currency: currency, memo: memo });
}

function updateFollowerList(lastFollowerUsername) {

	if (lastFollowerUsername === null || lastFollowerUsername === undefined)
		lastFollowerUsername = null;

	var followerBatchSize = 1000;
	steem.api.getFollowers(botUserData.name, lastFollowerUsername, "blog", followerBatchSize, function (err, result) {
		if (!err) {
			var names = result.map(function (f) { return f.follower; });
			if (lastFollowerUsername === names[0])
				names.splice(0, 1);

			log("Refreshing Followers : found " + names.length);
			//log(names);

			steem.api.getAccounts(names, function (e, users) {
				if (!err) {
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
				setTimeout(function () {
					saveFollowerList();
				}, 5000);
			}

		} else {
			log(err);
		}
	});
}

function setLastHandledTransaction(lastIndex) {
	lastHandledTransaction = lastIndex;
	fs.writeFile(LAST_TRANSACTION_FILEPATH, JSON.stringify({ index: lastIndex }), function (err) {
		if (err) {
			log(err);
		} else {
			log("Last interaction (" + lastIndex + ") saved to " + LAST_TRANSACTION_FILEPATH);
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
	transaction.timestamp = historyItem[1].timestamp;
	transaction.block = historyItem[1].block;
	transaction.type = historyItem[1].op[0];

	if (transaction.from === botUser.name)
		return null;

	var transactionString = transaction.from + " [" + transaction.amount + "] - '" + transaction.memo + "'";

	try {
		transaction.amountStrFull = transaction.amount;
		var splitted = transaction.amount.split(' ');
		transaction.amountStr = transaction.amount;
		transaction.currency = splitted[1];
		transaction.amountStr = splitted[0];
		transaction.amount = parseFloat(transaction.amountStr);
	}
	catch (ex) {
		log("Failed to parse transaction amount: " + transactionString + "\t : \t" + ex);
		return null;
	}

	try {
		var urlIndex = transaction.memo.indexOf(STEEMITURL);
		if (urlIndex == -1) {
			logPublically(transaction.from + "'s memo doesn't contain a SteemIt link (" + transaction.memo + "). "
				+ "The bot will assume that it was a donation. Thank you. "
				+ "(If it was not a donation, feel free to contact me to settle the problem.)",
				transaction.from);
			return null;
		}

		var memo = transaction.memo.trim();

		if (memo.indexOf("#") >= 0)
			memo = memo.substring(0, memo.indexOf("#"));

		var authorAndPermlink = memo.substring(memo.indexOf('/@') + 2)
		transaction.author = authorAndPermlink.split('/')[0];
		transaction.permlink = authorAndPermlink.substring(transaction.author.length + 1);
	}
	catch (ex) {
		logPublically(transaction.from + "'s memo couldn't be parsed as link (" + transaction.memo + ")",
			transaction.from, transaction.amountStr, transaction.currency);
		return null;
	}

	log(transactionString)
	return transaction;
}

function tryRetreiveEarnings(botUser, owner) {
	steem.api.getAccounts([botUser.name], function (err, result) {

		var user = result[0];
		var balances = [];

		[user.balance, user.sbd_balance]
			.forEach(function (amountStrFull) {
				try {
					var splitted = amountStrFull.split(' ');
					balances.push({
						amount: parseFloat(splitted[0]),
						currency: splitted[1]
					});
				}
				catch (ex) {
					log("Failed to parse current balance amount: " + amountStrFull + "\t : \t" + ex);
				}
			}, this);

		balances.forEach(function (balance) {
			if (balance.amount > MIN_RETRIVABLE_AMOUNT) {
				var amountToSend = (balance.amount - MIN_LEFTOVER_BALANCE).toFixed(3).toString();
				log(amountToSend + " " + balance.currency + " will be sent to @" + owner);
				transactionqueue.push({ to: owner, amount: amountToSend, currency: balance.currency, memo: "maintenance" });
			}
		}, this);
	});
}

function countResteemsIn24Hours() {
	var now = new Date();
	var from = now - 24 * HOUR;
	var to = now - 0;

	steem.api.getAccountHistory(botUser.name, 99999999, 1000, function (err, accountHistory) {
		var foundResteems = [];
		for (var i in accountHistory) {

			if (!accountHistory.hasOwnProperty(i))
				continue;

			var historyItem = accountHistory[i];
			var op = historyItem[1].op;
			if (JSON.stringify(op).indexOf("reblog") == -1)
				continue;

			try {
				var resteemOp = JSON.parse(op[1].json)[1];
				if (resteemOp.account != botUser.name)
					continue;
			} catch (error) {
				continue;
			}

			resteemOp.date = Date.parse(historyItem[1].timestamp);

			if (resteemOp.date < from) continue;
			if (resteemOp.date > to) continue;

			foundResteems.push(resteemOp);
		}

		console.log("Found " + foundResteems.length + " resteemed articles in the last 24 hours");
		countOfResteemsIn24Hours = foundResteems.length;
	});
}

function checkIfPostIsLuckyEnoughToBeUpvoted(postData) {
	var isWinner = (Math.random() * countOfResteemsIn24Hours) > countOfResteemsIn24Hours - dailyUpvoteCount;
	if (isWinner) {
		log(postData.author + " is lucky! His/her post will be upboted!")
		setTimeout(function () {
			votequeue.push({ author: postData.author, permlink: postData.permlink, votingPower: WINNER_VOTING_POWER });
			commentqueue.push({ author: postData.author, permlink: postData.permlink, body: WINNER_COMMENT });
			transactionqueue.push({ to: postData.author, amount: "0.001", currency: "SBD", memo: WINNER_MEMO });
		}, 60 * SECOND);
	}
}

function getMillisecondsTill12() {
	var d = new Date();
	d.setHours(12);
	d.setMinutes(00);
	d.setSeconds(00);

	var msTo12 = d - new Date();
	if (msTo12 < 0)
		msTo12 += 24 * HOUR

	return msTo12;
}

/////////////

function voteForAPostInTheQueue(ownUser) {
	if (votequeue.length < 1)
		return;

	var post = votequeue.shift();
	vote(post.ownUser || ownUser, post.author, post.permlink, post.votingPower);
}

function resteemAPostsInTheQueue(ownUser) {
	if (resteemqueue.length < 1)
		return;

	var post = resteemqueue.shift();
	resteemPost(post.ownUser || ownUser, post.author, post.permlink);
}

function writeACommentInTheQueue(ownUser) {
	if (commentqueue.length < 1)
		return;

	var post = commentqueue.shift();
	createComment(post.ownUser || ownUser, post.author, post.permlink, post.body);
}

function logTransactionMemoFromQueue(ownUser) {
	if (transactionmemosqueue.length < 1)
		return;

	var memo = transactionmemosqueue.shift();
	logViaTransaction(ownUser, memo);
}

function sendTransactionFromQueue(ownUser) {
	if (transactionqueue.length < 1)
		return;

	var transaction = transactionqueue.shift();
	makeTransaction(transaction.ownUser || ownUser, transaction.to, transaction.amount, transaction.currency, transaction.memo);
}

/////////////

function initUser(ownUser) {
	log("Logging in as @" + ownUser.name + "...");

	var user = {
		wif: steem.auth.toWif(ownUser.name, ownUser.password, 'owner'),
		name: ownUser.name
	};

	log("Logged in!");

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
			var alreadyResteemed = err.message.indexOf("Account has already reblogged this post") > -1;
			logPublically('Failed to re-steem [' + author + '] : '
				+ (alreadyResteemed ? "Account has already reblogged this post" : "Unknown Reason"));

			if (!alreadyResteemed)
				log('Failed to re-steem [' + author + '] : ' + err);
		}
	});
}

function makeTransaction(ownUser, to, amount, currency, memo) {
	steem.broadcast.transfer(ownUser.wif, ownUser.name, to, amount + " " + currency, memo, function (err, result) {
		if (!err && result) {
			log("Successfull transaction from " + ownUser.name + " of " + amount + " " + currency + " to '" + to + "'");
		} else {
			console.log(err.message);
		}
	});
}

function logViaTransaction(ownUser, memo) {
	steem.broadcast.transfer(ownUser.wif, ownUser.name, ownUser.name, "0.001 SBD", memo, function (err, result) {
		if (err) {
			console.log(err.message);
		}
	});
}

/////////////

var dateFormatOptions = { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
//new Date().toLocaleTimeString("en-us", dateFormatOptions)

function log(str) { console.log(new Date().toString(), str); }
