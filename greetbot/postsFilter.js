var englishEvaluater = require("./englishEvaluater");
var steem = require("steem");

module.exports = {
    simpleFilter:simpleFilter,
    complexFilter:complexFilter,
}

var ignoredTags = [
    "introduceyourself", "introducemyself", "meme", "colorchallenge", 
    "faith", "christian-trail", "christianity", "religion", "yeshua", "god", "bible", 
    "free", "giveaway"
];

MIN_REP = 25;
MAX_REP = 30;

function simpleFilter(comment) {
    if (comment.body.length < 5000)
        return false;
    
    var json = JSON.parse(comment.json_metadata);

    if(!json.image || json.image.length < 0)
        return false;

    if (json.tags.some(t => ignoredTags.some(it => t === it)))
        return false;

    if (comment.body.startsWith("<html") ||
        comment.body.startsWith("<div") ||
        comment.body.startsWith("<table") ||
        comment.body.startsWith("<body") ||
        comment.body.startsWith("<title"))
        return false;

    return true;
}

function complexFilter(posts, callback) {

    var posts = posts
        .map(p => {
            p.score = englishEvaluater.isTextInEnglish(p.body);
            return p;
        })
        .filter(p => p.score.isEnglish);

    var postsByAuthor = {};
    posts.forEach(p => {
        if(!postsByAuthor[p.author])
            postsByAuthor[p.author] = [];
        postsByAuthor[p.author].push(p);
    });

    var nonSpammers = Object.keys(postsByAuthor)
        .filter(a=>postsByAuthor[a].length < 5);

    steem.api.getAccounts(nonSpammers, function(err, usersData){
        if(err){
            console.log(err);
            return;
        }

        // check user's reputation
        nonSpammers = usersData.filter(u=>{
            var reputation = steem.formatter.reputation(u.reputation);
            return (MIN_REP <= self.reputation && self.reputation <= MAX_REP);
        });

        // check user's money
        nonSpammers = nonSpammers.filter(u=>{
            return Object.keys(u)
                .filter(k => u[k] + "".indexOf("STEEM") > 4 || u[k] + "".indexOf("SBD") > 4)
                .every(k => parseFloat(u[k]) < 200);
        });

        posts = [];
        for (var a in nonSpammers){
            var username = nonSpammers[a].name;

            for (var p in postsByAuthor[username]) {
                postsByAuthor[username][p].user = nonSpammers[a];
                posts.push(postsByAuthor[a][p]);
            }
        }
                
        var approvedPosts = [];
        posts.forEach(p => {
            steem.api.getContent(p.author, p.permlink, function (err, content) {
                try {
                    if(err){
                        console.log(err);
                        return;
                    }

                    //no downvotes
                    if(content.active_votes.some(v=>v.percent < 0))
                        return;

                    //no 'cheetah' votes
                    if(content.active_votes.some(v=>v.voter === 'cheetah'))
                        return;

                    //pending payout < 3
                    if (parseFloat(content.pending_payout_value) > 3)
                        return;

                    approvedPosts.push(p);
                        
                } finally {
                    if(posts[posts.length-1] === p){
                        callback(approvedPosts);
                    }
                }
            });
        });
    });
}

