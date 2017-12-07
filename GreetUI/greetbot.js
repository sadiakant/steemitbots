/**
 * https://steemit.com/@investigation
 */

var steem = require("steem");

var steemitWSS = "wss://steemd-int.steemit.com"
steem.api.setOptions({ url: steemitWSS });

var bot = (function () {

	var SECOND = 1000;
	var MINUTE = 60 * SECOND;
	var HOUR = 60 * MINUTE;

	var STEEMITURL = "https://steemit.com";

	/////////////

	var transactionqueue = [];
	var commentqueue = [];
	var resteemqueue = [];
	var votequeue = [];
	var followqueue = [];

	var settings = {};

	var checkForPostsSince = "";

	/////////////



	/////////////

	// ## PLAYGROUND ## //

	/////////////

	function start(_settings) {
		settings = _settings;
		initUser()

		log("Starting GreetBot...");

		/////////////

		lookForPosts();
		setInterval(function () { lookForPosts(); }, settings.scanPeriodMinutes * MINUTE);

		if(settings.doUpvote)
			setInterval(function () { voteForAPostInTheQueue(); }, 10 * SECOND);
		if(settings.doComment)
			setInterval(function () { writeACommentInTheQueue(); }, 40 * SECOND);
		if(settings.doTip)
			setInterval(function () { sendTransactionFromQueue(); }, 10 * SECOND);
		if(settings.doResteem)
			setInterval(function () { resteemAPostsInTheQueue(); }, 1 * SECOND);
		if(settings.doFollow)
			setInterval(function () { followAUserInTheQueue(); }, 10 * SECOND);
	}

	/////////////

	function lookForPosts() {

		log("-- Looking for posts... --")

		var searchOptions = { limit: settings.processedPostCount };
		if (settings.category != null)
			searchOptions.tag = settings.category;

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

					if (settings.doRestrict) {
						var reputation = steem.formatter.reputation(user.reputation);

						if (settings.minReputation > reputation) { continue; }
						if (settings.maxReputation < reputation) { continue; }

						if (settings.minPostLength > post.body.length) { continue; }

						var hasRequiredKeywords = true;
						if (settings.requiredKeywords)
							settings.requiredKeywords.forEach(function (keyword) {
								if (post.body.indexOf(keyword) === -1)
									hasRequiredKeywords = false;
							}, this);
						if (!hasRequiredKeywords) { continue; }
					}

					log("Noticed post of " + user.name + "[" + reputation + "] ==> " + STEEMITURL + post.url);

					var commentBody = settings.commentBody.replace("%AUTHOR", user.name);
					var tipMemo = settings.tipMemo.replace("%AUTHOR", user.name);

					if (settings.doUpvote)
						votequeue.push({ author: user.name, permlink: post.permlink, votingPower: settings.upvotePowerPercentage * 100 });
					if (settings.doComment)
						commentqueue.push({ author: user.name, permlink: post.permlink, body: commentBody });
					if (settings.doTip)
						transactionqueue.push({ to: user.name, amount: settings.tipAmount, currency: "SBD", memo: tipMemo });
					if (settings.doResteem)
						resteemqueue.push({ author: user.name, permlink: post.permlink });
					if (settings.doFollow)
						followqueue.push(user.name);

				}
			});
		});
	}

	/////////////



	/////////////

	function voteForAPostInTheQueue() {
		if (votequeue.length < 1)
			return;

		var post = votequeue.shift();
		vote(post.author, post.permlink, post.votingPower);
	}

	function followAUserInTheQueue() {
		if (followqueue.length < 1)
			return;

		var username = followqueue.shift();
		follow(username);
	}

	function resteemAPostsInTheQueue() {
		if (resteemqueue.length < 1)
			return;

		var post = resteemqueue.shift();
		resteemPost(post.author, post.permlink);
	}

	function writeACommentInTheQueue() {
		if (commentqueue.length < 1)
			return;

		var post = commentqueue.shift();
		createComment(post.author, post.permlink, post.body);
	}

	function sendTransactionFromQueue() {
		if (transactionqueue.length < 1)
			return;

		var transaction = transactionqueue.shift();
		makeTransaction(transaction.to, transaction.amount, transaction.currency, transaction.memo);
	}

	///////////// 

	function initUser() {
		settings.wif = steem.auth.toWif(settings.name, settings.password, 'owner');

		if (settings.wif == undefined)
			throw new Error("'wif' is undefined");
	}

	function vote(author, permlink, votingPower) {
		steem.broadcast.vote(settings.wif, settings.name, author, permlink, votingPower, function (err, voteResult) {
			if (!err && voteResult) {
				log(settings.name + " voted " + (votingPower / 100) + "% : /" + author + "/" + permlink);
			} else {
				log('Voting failed (' + author + '): ' + err.message);
			}
		});
	}

	function follow(user) {
		var json = ['follow',{follower:settings.name, following: user, what: ["blog"]}];
		window.steem.broadcast.customJsonAsync(settings.wif, [], [settings.name], "follow", JSON.stringify(json), function(err, result) {
			if (!err && result) {
				log("Successfull following of " + user);
			} else {
				log("Failed to follow : " + err.message);
			}
		});
	}

	function getCommentOperationsArray(parent_author, parent_permlink, comment) {
		var benefactor = "investigation";
		var dollarUnit = "SBD";

		var timeStr = new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
		var parent_permlink = parent_permlink.replace(/(-\d{8}t\d{9}z)/g, "");
		var commentPermlink = "re-" + parent_author + "-" + parent_permlink + "-" + timeStr;

		var metadata = {tags: [settings.category || "greetbot"], app: 'greetbot/0.0.1', format: 'markdown+html', community: 'greetbot' };

		var operations_array = [
			['comment', {
				parent_author: parent_author,
				parent_permlink: parent_permlink,
				author: settings.name,
				permlink: commentPermlink,
				title: "GreetBot Comment",
				body: comment
				, json_metadata: JSON.stringify(metadata)
			}],
			['comment_options', {
				allow_curation_rewards: true,
				allow_votes: true,
				author: settings.name,
				permlink: commentPermlink,
				max_accepted_payout: "1000000.000 " + dollarUnit,
				percent_steem_dollars: 10000,
				extensions: [[0, { "beneficiaries": [{ "account":benefactor, "weight":3000 }] }]]
			}]
		];
		return operations_array;
	}

	function createComment(author, permlink, body) {
		var operations = getCommentOperationsArray(author, permlink, body);
		window.steem.broadcast.send(
			{ operations: operations, extensions: [] }, 
			{ posting: settings.wif },
			function (err, result) {
				if (!err && result) {
					log('Successful comment: [' + author + '] ' + permlink);
				} else {
					log('Failed to create comment: ' + err.message);
				}
			});

		//// The code bellow sends a simpler comment without benefactories

		// var commentPermlink = steem.formatter.commentPermlink(author, permlink);
		// steem.broadcast.comment(settings.wif, author, permlink, settings.name, commentPermlink, "", body, "", function (err, result) {
		// 	if (!err && result) {
		// 		log('Successful comment: [' + author + '] ' + permlink);
		// 	} else {
		// 		log('Failed to create comment: ' + err);
		// 	}
		// });
	}

	function resteemPost(author, permlink) {
		const json = JSON.stringify(['reblog', {
			account: settings.name,
			author: author,
			permlink: permlink
		}]);

		steem.broadcast.customJson(settings.wif, [], [settings.name], 'follow', json, (err, result) => {
			if (!err && result) {
				log('Successful re-steem: [' + author + '] ' + permlink);
			} else {
				log('Failed to re-steem: ' + err);
			}
		});
	}

	function makeTransaction(to, amount, currency, memo) {
		steem.broadcast.transfer(settings.wif, settings.name, to, amount + " " + currency, memo, function (err, result) {
			if (!err && result) {
				log("Successfull transaction from " + settings.name + " of " + amount + " " + currency + " to '" + to + "'");
			} else {
				log("Transaction failed : " + err.message);
			}
		});
	}

	/////////////

	var dateFormatOptions = { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
	function log(str) {
		var message = " ► " + new Date().toLocaleTimeString("en-us", dateFormatOptions) + " : " + str;
		var log = document.getElementById("log");
		if (log) {
			var line = document.createElement("div");
			line.innerHTML = message;
			log.appendChild(line);
		}
		else {
			console.log(message);
		}
	}

	return { start: start }
})();

