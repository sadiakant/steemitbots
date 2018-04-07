/**
 * https://steemit.com/@investigation
 */

/////////////

var minReputation = 73;

var ownUserData = [
	// { name: "", password: "" },
	// { name: "", password: "" }
]

/////////////

var fs = require('fs');
var steem = require('steem');

// URL taken from: https://developers.steem.io/
// If server is unreliable, select another URL
//		or run own node (2GB needed) as described in the linked docs
steem.api.setOptions({ url: 'https://gtg.steem.house:8090/' });

var SECOND = 1000;

var STEEMITURL = "https://steemit.com";

var ownUsers = ownUserData.map(function(ownUser){ return initUser(ownUser); });

var checkForPostsSince = ""

var votequeue = [];

lookForNewPosts();
setInterval(function() { lookForNewPosts(); }, 5 * SECOND);

ownUsers.forEach(function(user, i){ 
	setTimeout(function(){
		setInterval(function() { 
			voteForAPostInTheQueue(user); 
		}, 4 * SECOND); 
	}, (4 / ownUserData.length * i * SECOND) | 0);
});


function lookForNewPosts() {
	steem.api.getDiscussionsByCreated({"limit": 10}, function(err, results) {
			if (err === null) {
				results = results.reverse();
				var userNames = results.map(function(r){return r.author;});
				steem.api.getAccounts(userNames, function(e,users){ 
					for(var u in users){
						var user = users[u];
						var post = results[userNames.indexOf(user.name)];
						var reputation = steem.formatter.reputation(user.reputation);
						if(post.created <= checkForPostsSince) { continue; }
						if(reputation >= minReputation) {
							votequeue.push({ username: user.name, permlink:post.permlink, votingPower: 10000 } );
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

function voteForAPostInTheQueue(ownUser) {
	if (votequeue.length < 1)
		return;
	
	var post = votequeue.shift();
	vote(ownUser, post.username, post.permlink, post.votingPower);
}

function initUser(ownUser){
	var user = {
		wif : steem.auth.toWif(ownUser.name, ownUser.password, 'posting'), 
		name : ownUser.name
	};
	
	if(user.wif == undefined)
		throw new Error("'wif' is undefined");

	return user;
}

function vote(ownUser, author, permlink, votingPower){
	steem.broadcast.vote(ownUser.wif, ownUser.name, author, permlink, votingPower, function(err, voteResult) {
		if(!err && voteResult){
			log(ownUser.name + " voted " + (votingPower / 100) + "% : /" + author + "/" + permlink );
		}else{
			log('Voting failure (' + author + '): ' + err);
		}
	});
}

function createComment(ownUser, author, permlink, body){
	var commentPermlink = steem.formatter.commentPermlink(author, permlink);
	steem.broadcast.comment(ownUser.wif, author, permlink, ownUser.name, commentPermlink, "", body, "", function(err, result) {
		if(!err && result){
			log('Successful comment: '+body);
		}else{
			log('Failed to create comment: '+err);
		}
	});
	
}

var dateFormatOptions = { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };  
function log(str){ console.log(new Date().toLocaleTimeString("en-us", dateFormatOptions) + ":  " + str); }