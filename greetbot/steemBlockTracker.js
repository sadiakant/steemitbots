var steem = require("steem");
var fs = require("fs");

var LAST_PARSED_BLOCK_PATH = "./lastParsedBlock.json";

var lastParsedBlock = JSON.parse(fs.readFileSync(LAST_PARSED_BLOCK_PATH)).number

module.exports= { readNewBlocks: readNewBlocks };

var readqueue = [];
setInterval(function () {
	if (readqueue.length < 1)
        return;

    var readAction = readqueue.shift();
    parseBlockComments(
        readAction.blockNum, 
        readAction.username,
        readAction.callbackOnCommentWithMention,
        readAction.callbackOnEveryNewPost);
}, 100);

function readNewBlocks(username, callbackOnCommentWithMention, callbackOnEveryNewPost) {
    steem.api.getState("", function(err, data){
        var lastBlock = data.props.last_irreversible_block_num;
        var blocksToRead = [];
        while(lastBlock > lastParsedBlock+1)
            blocksToRead.push(++lastParsedBlock);
        setLastParsedBlockNumber(lastParsedBlock);
        
        blocksToRead.forEach(b => 
            readqueue.push({
                blockNum:b, 
                username:username, 
                callbackOnCommentWithMention:callbackOnCommentWithMention, 
                callbackOnEveryNewPost:callbackOnEveryNewPost
            }
        ));
    });
}

function parseBlockComments(blockNum, username, callbackOnCommentWithMention, callbackOnEveryNewPost) {
    steem.api.getOpsInBlock(blockNum, false, function(err, data){
        if(!data) 
            return;
        var comments = data.map(d=>d.op).filter(op=>op[0] == "comment").map(op=>op[1]);
        comments.forEach(comment => {
            if(comment.body.indexOf("@"+username) > -1) {
                callbackOnCommentWithMention(comment);
            }
            if(!comment.parent_author) {
                callbackOnEveryNewPost(comment);
            }
        });
    });
}

function setLastParsedBlockNumber(lastParsedBlock){
    var text = JSON.stringify({number : lastParsedBlock});
    fs.writeFileSync(LAST_PARSED_BLOCK_PATH, text);
}