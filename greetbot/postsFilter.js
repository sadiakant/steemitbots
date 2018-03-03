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

    var posts = posts.filter(p => 
        englishEvaluater.isTextInEnglish(p.body).isEnglish);

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
            var rep = steem.formatter.reputation(u.reputation);
            return (MIN_REP <= rep && rep <= MAX_REP);
        });

        posts = [];
        for (var a in nonSpammers){
            var username = nonSpammers[a].name;

            for (var p in postsByAuthor[username]) {
                postsByAuthor[username][p].user = nonSpammers[a];
                posts.push(postsByAuthor[username][p]);
            }
        }
                
        var approvedPosts = [];
        var onContent = function (err, content) {
            try {
                if(err)
                    return console.log(err);
                if(content.active_votes.some(v=>v.percent < 0))
                    return; //no downvotes
                if(content.active_votes.some(v=>v.voter === 'cheetah'))
                    return; //no 'cheetah' votes
                if (parseFloat(content.pending_payout_value) > 3)
                    return; //pending payout < 3
                approvedPosts.push(content);
            } finally {
                if(posts[posts.length-1].permlink === content.permlink){
                    callback(approvedPosts);
                }
            }
        };

        posts.forEach(function(p, i) {
            setTimeout(function () {
                steem.api.getContent(p.author, p.permlink, onContent);
            }, i * 50);
        }, this);
    });
}

