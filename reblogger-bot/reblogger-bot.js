/**
 * https://steemit.com/@investigation
 */

/////////////

var MIN_REPUTATION = 0;

var botUserData = require("./userData.json")

var URL_TO_INTRODUCTION_POST = "https://steemit.com/resteembot/@reblogger/reblogger-new-resteeming-bot-based-on-resteembot";

var SECOND = 1000;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;
var MUST_FOLLOW_SINCE = 7 * MINUTE;
var ADVERTISMENT_PERIOD = HOUR;

var ADVERTISMENT_UNTIL_STR = "2017-10-15 00:00:01 +00:00";
var LOCAL_TIMEZONE = -(new Date().getTimezoneOffset()) * MINUTE;
var STEEM_TIMEZONE = 7 * HOUR;
var ADVERTISE_UNTIL_UTC = Date.parse(ADVERTISMENT_UNTIL_STR);
var ADVERTISE_UNTIL_LOCAL = ADVERTISE_UNTIL_UTC + (LOCAL_TIMEZONE);

var RE_RESTEEM_COMENT = "Whatever @resteembot resteems, I resteem too!\n" +
"I am a new, simple to use and cheap resteeming bot\n" +
"I will automatically resteem posts resteemed by @resteembot until " + ADVERTISMENT_UNTIL_STR + "\n" +
"If you want to read more about me, [read my introduction post](" + URL_TO_INTRODUCTION_POST + ").";

var ADVERTISMENT_COMENT = "Hi, %AUTHOR! I just resteemed your post!\n" +
"I am a new, simple to use and cheap resteeming bot.\n" +
"If you want to know more about me, [read my introduction post](" + URL_TO_INTRODUCTION_POST + ").\n" +
"Good Luck!";

var RESTEEM_COMMENT = "This post was resteemed by @" + botUserData.name + "!\n" +
	"Good Luck!\n" +
	"\n" +
	"Learn more about the @" + botUserData.name + " project [in the introduction post](" + URL_TO_INTRODUCTION_POST + ").";

var RESTEEMED_THANKS_TO = "\n Your post was resteemed thanks to @";

var URL_TO_VOTING_LOTTERY_POST = URL_TO_INTRODUCTION_POST;
var URL_TO_LOGO = "https://s2.postimg.org/vrm6bzo09/bot2_100.pngs";

var WINNER_COMMENT = "You were lucky! Your post was selected for an upvote!"
	+ "\n[Read about the bot](" + URL_TO_VOTING_LOTTERY_POST + ")"
	+ "\n![logo](" + URL_TO_LOGO + ")";

var WINNER_MEMO = "A post of yours was randomly upvoted by @" + botUserData.name
	+ ". Thank you for using the bot.";

var WINNER_VOTING_POWER = 10000;

/////////////

var fs = require('fs');
var steem = require('steem');

var steemitWSS = "wss://steemd-int.steemit.com"
steem.api.setOptions({ url: steemitWSS });

var STEEMITURL = "https://steemit.com/";
var LAST_TRANSACTION_FILEPATH = "./lastHandledTransaction.json";
var FOLLOWERS_FILEPATH = "./followers.json";

var botUser = initUser(botUserData);

var checkForPostsSince = ""
var lastHandledTransaction = require(LAST_TRANSACTION_FILEPATH).index;

var createdBy = "investigation";
var MIN_RETRIVABLE_AMOUNT = 5.02;
var MIN_LEFTOVER_BALANCE = 0.02;

var countOfResteemsIn24Hours = 5000;

var RESTEEM_PRICE = 0.05;

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
setInterval(function () { updateFollowerList(); }, MUST_FOLLOW_SINCE);

setInterval(function () { checkForNewTransactions(); }, 10 * SECOND);

setInterval(function () {
	if (new Date() < ADVERTISE_UNTIL_LOCAL + HOUR + HOUR) advertiseOnResteemBotsResteems("resteembot");
}, ADVERTISMENT_PERIOD);

setInterval(function () { resteemAPostsInTheQueue(botUser); }, 1 * SECOND);

setInterval(function () { voteForAPostInTheQueue(botUser); }, 10 * SECOND);

setInterval(function () { logTransactionMemoFromQueue(botUser); }, 10 * SECOND);

setInterval(function () { sendTransactionFromQueue(botUser); }, 10 * SECOND);

setInterval(function () { writeACommentInTheQueue(botUser); }, 40 * SECOND);

tryRetreiveEarnings(botUser, createdBy);
setInterval(function () { tryRetreiveEarnings(botUser, createdBy); }, 1 * HOUR);

setTimeout(function () {
	countResteemsIn24Hours();
	setInterval(function () { countResteemsIn24Hours(); }, 1 * HOUR);
}, getMillisecondsTill12());

setTimeout(function () {
	setInterval(function () { advertise(1, null, 30, 45, 500); }, 5 * MINUTE);
}, 13 * MINUTE);

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
		
		var detectedTransactions = 0;
		var newItems = 0;
		
		var lastIndex = accountHistory[accountHistory.length-1][1].timestamp
			+ "#" + accountHistory[accountHistory.length-1][1].block;
			
		for (var i in accountHistory) {

			var doResteem = false;
			var doUpvote = false;

			var index = accountHistory[i][1].timestamp + "#" + accountHistory[i][1].block;
			if (index <= lastHandledTransaction) continue;
			else newItems++

			transaction = parseAsTransaction(accountHistory[i]);
			if (transaction === null || transaction === undefined) {
				continue;
			}

			var follower = followers[transaction.from];
			if (follower === undefined || follower === null) {
				logPublically(transaction.from + " is not a follower, or 10 minutes haven't passed since following",
					transaction.from, transaction.amountStr, transaction.currency);
				continue;
			}

			if (follower.reputation < MIN_REPUTATION) {
				logPublically(transaction.author + " has too low reputation : " + follower.reputation + ". Minimum is " + MIN_REPUTATION, transaction.from);
				continue;
			}

			var resteemsOwnPost = transaction.from === transaction.author;
			if (transaction.amount < RESTEEM_PRICE - 0.001) {
				var message = transaction.from + " paid " + transaction.amountStrFull + " but the minimum price is " + RESTEEM_PRICE.toFixed(3);
				logPublically(message, transaction.from, transaction.amountStr, transaction.currency);
				continue;
			}

			detectedTransactions++;

			log("Transaction detected: " + transaction.from + " payed [" + transaction.amountStrFull + "] with memo " + transaction.memo);

			var thanksTo = (resteemsOwnPost ? "" : RESTEEMED_THANKS_TO + transaction.from);
			resteemqueue.push({ author: transaction.author, permlink: transaction.permlink });
			commentqueue.push({ author: transaction.author, permlink: transaction.permlink, body: RESTEEM_COMMENT + thanksTo });
			checkIfPostIsLuckyEnoughToBeUpvoted(transaction);

			setLastHandledTransaction(index);
		}

		if (newItems > 0 && detectedTransactions === 0)
			setLastHandledTransaction(lastIndex);
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
				saveFollowerList();
			}

		} else {
			log(err);
		}
	});
}

function advertiseOnResteemBotsResteems(resteembotUsername) {
	var from = new Date() - ADVERTISMENT_PERIOD;

	console.log("Advertising on posts resteemed since : " + new Date(from).toString());

	steem.api.getAccountHistory(resteembotUsername, 99999999, 500, function (err, accountHistory) {
		var foundResteems = [];
		for (var i in accountHistory) {

			var historyItem = accountHistory[i];
			var op = historyItem[1].op;
			if (JSON.stringify(op).indexOf("reblog") == -1)
				continue;

			try {
				var resteemOp = JSON.parse(op[1].json)[1];
			} catch (error) {
				continue;
			}

			resteemOp.timestamp = historyItem[1].timestamp;
			resteemOp.date = Date.parse(resteemOp.timestamp);

			if (resteemOp.date < from)
				continue;

			foundResteems.push(resteemOp);
		}

		log("Found " + foundResteems.length + " posts resteemed by @" + resteembotUsername + " since " + new Date(from).toString());
		foundResteems.forEach(function (resteem) {
			resteemqueue.push({ author: resteem.author, permlink: resteem.permlink });
			commentqueue.push({ author: resteem.author, permlink: resteem.permlink, body: RE_RESTEEM_COMENT });
		}, this);
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

		if (memo.indexOf("#") >= 0) {
			logPublically("@" + botUserData.name + " can't resteem comments. Only posts can be resteemed. (your memo was : " + transaction.memo + ")",
				transaction.from, transaction.amountStr, transaction.currency);
			return null;
		}

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

			var historyItem = accountHistory[i];
			var op = historyItem[1].op;
			if (JSON.stringify(op).indexOf("reblog") == -1)
				continue;

			try {
				var resteemOp = JSON.parse(op[1].json)[1];
			} catch (error) {
				continue;
			}

			resteemOp.date = Date.parse(historyItem[1].timestamp);

			if (resteemOp.date < from) continue;
			if (resteemOp.date > to) continue;

			foundResteems.push(resteemOp);
		}

		log("Found " + foundResteems.length + " resteemed articles in the last 24 hours");
		countOfResteemsIn24Hours = foundResteems.length;
	});
}

function checkIfPostIsLuckyEnoughToBeUpvoted(postData) {
	var randomNum = Math.floor(Math.random() * (countOfResteemsIn24Hours / 10));
	var isWinner = (randomNum === 1)
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

function advertise(processedPostCount, category, minReputation, maxReputation, minPostLength) {

	log("-- Looking for posts to advertise... --")

	var searchOptions = { limit: processedPostCount };
	if (category != null)
		searchOptions.tag = category;

	steem.api.getDiscussionsByCreated(searchOptions, function (e, posts) {

		if (e !== null) {
			console.log(e);
			return;
		}

		posts = posts.reverse();

		var userNames = posts.map(function (r) { return r.author; });
		steem.api.getAccounts(userNames, function (e, users) {

			if (e !== null) {
				console.log(e);
				return;
			}

			for (var u in users) {
				var user = users[u];
				var post = posts[userNames.indexOf(user.name)];
				if (post.created <= checkForPostsSince) { continue; }

				checkForPostsSince = post.created;

					var reputation = steem.formatter.reputation(user.reputation);

				if (minReputation > reputation) { continue; }
				if (maxReputation < reputation) { continue; }

				if (minPostLength > post.body.length) { continue; }

				log("Noticed post of " + user.name + "[" + reputation + "] ==> " + STEEMITURL + post.url);

				var commentBody = ADVERTISMENT_COMENT.replace("%AUTHOR", user.name);

				commentqueue.push({ author: user.name, permlink: post.permlink, body: commentBody });
				resteemqueue.push({ author: user.name, permlink: post.permlink });
			}
		});
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

function sendTransactionFromQueue(ownUser) {
	if (transactionqueue.length < 1)
		return;

	var transaction = transactionqueue.shift();
	makeTransaction(ownUser, transaction.to, transaction.amount, transaction.currency, transaction.memo);
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
function log(str) { console.log(new Date().toLocaleTimeString("en-us", dateFormatOptions) + ":  ", str); }
