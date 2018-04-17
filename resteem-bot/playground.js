var steem = require("steem");

    //     https://steemit.com/doge/@crystalhuman/new-weekly-doge-lotto-win-free-dogecoin

var author = "crystalhuman";
var permlink = "new-weekly-doge-lotto-win-free-dogecoin";
var ___self = "resteembot"
var __textToWrite = "Resteemed by @resteembot! Good Luck!\nCurious? Read @resteembot's "+
    "[introduction post](https://steemit.com/resteembot/@resteembot/how-to-use-resteembot-updated-2017824t202525149z)\n"+
    "Check out the great posts I already resteemed.\n\n"+
    "[ResteemBot's Maker is Looking for Work](https://steemit.com/resteembot/@resteembot/hire-me-i-ll-code-for-crypto)";

steem.api.getContentReplies(author, permlink, function (err, replies) {
    if(err) {
       console.log("Failed to get replies of /@" + author + "/" + permlink)
       console.log(err);
       return;
    }
   
    var matchingReplies = replies.filter(r=>r.author == ___self).filter(r=>r.body == __textToWrite);
    if(matchingReplies.length > 0) {
        console.log("Bot has already commented on this post /@" + author + "/" + permlink + " (" + matchingReplies.length + " times)");
    }
    else {
        console.log("Write the comment");
    }
});