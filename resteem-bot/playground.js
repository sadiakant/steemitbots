var steem = require("steem");

steem.api.setOptions({ url: 'https://api.steemit.com' });

var lastBlock = 0;
var latestHistoryItem = 0;

steem.api.getAccountHistory("resteembot", 99999999, 1000, function (err, accountHistory) {
    latestHistoryItem = accountHistory[accountHistory.length-1][1].block;
});   

getLatestBlock();
setInterval(getLatestBlock, 10000);

setInterval(getHistory, 10011);

function getLatestBlock() {
    steem.api.getState("", function(err, data){
        lastBlock = data.props.last_irreversible_block_num - 20;
    });
}

function getHistory() {
    steem.api.getAccountHistory("resteembot", 99999999, 1000, function (err, accountHistory) {
        accountHistory = accountHistory
            .filter(h => 
                h[1].block > latestHistoryItem && h[1].block < lastBlock);
		for (var i in accountHistory) {
            accountHistory[i][1].op == "null";
            console.log("> " + new Date() + " - " + accountHistory[i][1].timestamp);
        }

        if (accountHistory.length > 0)
            latestHistoryItem = accountHistory[accountHistory.length-1][1].block
    });   
}
