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
	console.log("[vote]", username, author, permlink, votingPower)
}

function resteemPost(wif, username, author, permlink) {
	console.log("[resteemPost]", username, author, permlink)
}

function createComment(wif, username, author, permlink, body) {
	console.log("[createComment]", username, author, permlink, "\n\t" + body.split("\n").join("\n\t"));
}

function makeTransaction(wif, username, to, amount, currency, memo) {
	console.log("[makeTransaction]", username, to, amount, currency, "\n\t" + memo);
}

function logViaTransaction(wif, username, memo) {
	console.log("[logViaTransaction]", username, "\n\t" + memo);
}