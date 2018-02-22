var englishEvaluater = require("./englishEvaluater");
var steem = require("steem");

module.exports = {
    filter:filter
}

const ignoredTags = [
    "introduceyourself", "introducemyself", "meme", "colorchallenge", "faith",
    "christian-trail", "christianity", "religion", "yeshua", "god", "bible", "free"
];

MIN_REP = 25;
MAX_REP = 30;

function filter(comment, callback) {
    if (comment.body.length > 5000)
        return;
    
    if(ignoredTags.some(t => comment.json_metadata.indexOf(t) >= 0))
        return;

    var self = {};
    self.score = englishEvaluater.isTextInEnglish(comment.body);
    self.comment = comment;
    self.callback = callback;

    if (self.score.isEnglish) {
        steem.api.getAccounts.call(self, [comment.author], function (e, users) {
            if (e) return;

            self.user = users[0];
            self.reputation = steem.formatter.reputation(self.user.reputation);

            if(MIN_REP <= self.reputation && self.reputation <= MAX_REP) {
                self.callback(self.comment, self.user, self.score);
            }
        });
    }

}
