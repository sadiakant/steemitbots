/**
 * https://steemit.com/@investigation
 */

/////////////

var SECOND = 1000;
var steem = require('steem');

module.exports = {
	start: start
};

/////////////

function start(wif, username) {

    var votequeue = [];
    var resteemqueue = [];
    var commentqueue = [];
    var transactionqueue = [];
    var logqueue = [];

    setInterval(function () { voteForAPostInTheQueue(wif, username, votequeue); }, 10 * SECOND);
    setInterval(function () { resteemAPostsInTheQueue(wif, username, resteemqueue); }, 1 * SECOND);
    setInterval(function () { writeACommentInTheQueue(wif, username, commentqueue); }, 40 * SECOND);
    setInterval(function () { sendTransactionFromQueue(wif, username, transactionqueue); }, 10 * SECOND);
    setInterval(function () { logTransactionMemoFromQueue(wif, username, logqueue); }, 10 * SECOND);

    return {
        vote: function (author, permlink, votingPower) {
            votequeue.push({
                author: author, 
                permlink: permlink,
                votingPower: votingPower
            });
        },
        resteem: function (author, permlink) {
            resteemqueue.push({
                author: author, 
                permlink: permlink
            });
        },
        comment: function (author, permlink, body) {
            commentqueue.push({
                author: author, 
                permlink: permlink, 
                body: body
            });
        },
        transfer: function (to, amount, currency, memo) {
            transactionqueue.push({
                to: to, 
                amount: amount, 
                currency: currency, 
                memo: memo
            });
        },
        log: function (memo) { 
            logqueue.push(memo);
        }
    }
}

/////////////

function voteForAPostInTheQueue(wif, username, queue) {
	if (queue.length < 1)
		return;

	var post = queue.shift();
	vote(wif, username, post.author, post.permlink, post.votingPower);
}

function resteemAPostsInTheQueue(wif, username, queue) {
	if (queue.length < 1)
		return;

	var post = queue.shift();
	resteemPost(wif, username, post.author, post.permlink);
}

function writeACommentInTheQueue(wif, username, queue) {
	if (queue.length < 1)
		return;

	var post = queue.shift();
	createComment(wif, username, post.author, post.permlink, post.body);
}

function sendTransactionFromQueue(wif, username, queue) {
	if (queue.length < 1)
		return;

	var transaction = queue.shift();
	makeTransaction(wif, username, transaction.to, transaction.amount, transaction.currency, transaction.memo);
}

function logTransactionMemoFromQueue(wif, username, queue) {
	if (queue.length < 1)
		return;

	var memo = queue.shift();
	logViaTransaction(wif, username, memo);
}

/////////////

function vote(wif, username, author, permlink, votingPower) {
	steem.broadcast.vote(wif, username, author, permlink, votingPower, function (err, voteResult) {
		if (!err && voteResult) {
			log(username + " voted " + (votingPower / 100) + "% : /" + author + "/" + permlink);
		} else {
			log('Voting failure (' + author + '): ' + err);
		}
	});
}

function resteemPost(wif, username, author, permlink) {
	const json = JSON.stringify(['reblog', {
		account: username,
		author: author,
		permlink: permlink
	}]);

	steem.broadcast.customJson(wif, [], [username], 'follow', json, (err, result) => {
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

function createComment(wif, username, author, permlink, body) {
	var commentPermlink = steem.formatter.commentPermlink(author, permlink);
	steem.broadcast.comment(wif, author, permlink, username, commentPermlink, "", body, "", function (err, result) {
		if (!err && result) {
			log('Successful comment: [' + author + '] ' + permlink);
		} else {
			log('Failed to create comment: ' + err);
		}
	});
}

function makeTransaction(wif, username, to, amount, currency, memo) {
	steem.broadcast.transfer(wif, username, to, amount + " " + currency, memo, function (err, result) {
		if (!err && result) {
			log("Successfull transaction from " + username + " of " + amount + " " + currency + " to '" + to + "'");
		} else {
			console.log(err.message);
		}
	});
}

function logViaTransaction(wif, username, memo) {
	steem.broadcast.transfer(wif, username, username, "0.001 SBD", memo, function (err, result) {
		if (err) {
			console.log(err.message);
		}
	});
}