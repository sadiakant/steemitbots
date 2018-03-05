var steem = require("steem");
var fs = require("fs");

var LAST_PARSED_BLOCK_PATH = "./lastParsedBlock.json";

var lastParsedBlock = JSON.parse(fs.readFileSync(LAST_PARSED_BLOCK_PATH)).number

module.exports = { 
    readNewBlocks: readNewBlocks,
    getRootCommentsBetween:getRootCommentsBetween,
    findFirstBlockAfterDate: findFirstBlockAfterDate,
};

///////////////////

var readqueue = [];
setInterval(function () {
	if (readqueue.length < 1)
        return;
    var readAction = readqueue.shift();
    steem.api.getOpsInBlock(readAction.blockNum, false, readAction.callback);
}, 100);

var readheaderqueue = [];
setInterval(function () {
	if (readheaderqueue.length < 1)
        return;
    var readAction = readheaderqueue.shift();
    steem.api.getBlockHeader(readAction.blockNum, readAction.callback);
}, 80);

///////////////////

function readNewBlocks(username, callback) {
    steem.api.getState("", function(err, data){
        if(err) return;
        var lastBlock = data.props.last_irreversible_block_num;
        var blocksToRead = [];
        while(lastBlock > lastParsedBlock+1)
            blocksToRead.push(++lastParsedBlock);
        setLastParsedBlockNumber(lastParsedBlock);
        
        if(blocksToRead.length > 100)
            console.log("Bot is lagging behind from the blockchain - " + blocksToRead.length + " blocks to read")

        blocksToRead.forEach(blockNum => 
            readqueue.push({
                blockNum:blockNum,
                callback:function (err, data) {
                    if(err){
                        console.log(err);
                        return;
                    }

                    if (blockNum % 500 == 0)
                        console.log("Reached block #" + blockNum);

                    var comments = data.map(d=>d.op).filter(op=>op[0] == "comment").map(op=>op[1]);
                    comments.forEach(comment => {
                        comment.timestamp = data[0].timestamp;
                        if(comment.body.indexOf("@"+username) > -1) {
                            console.log("Mention found : #" + blockNum);
                            callback(comment);
                        }
                    });
                }
            }
        ));
    });
}

function getRootCommentsBetween(fromDate, toDate, filter, callback) {
    steem.api.getState("", function(err, data){
        if(err){
            console.log(err);
            return;
        }
        var lastBlock = data.props.last_irreversible_block_num;
        findFirstBlockAfterDate(lastBlock, null, null, fromDate, function(blockNum_from, headers_from) {
            console.log("Found starting block : #" + blockNum_from);
            findFirstBlockAfterDate(lastBlock, null, null, toDate, function(blockNum_to, headers_to) {
                console.log("Found ending block : #" + blockNum_to);

                var blocksToReadLength =  (blockNum_to - blockNum_from);
                console.log("Blocks to read: " + blocksToReadLength);

                var blocksToRead = [];
                for (let i = 0; i < blocksToReadLength; i++) {
                    blocksToRead.push(blockNum_from + i);
                }

                var results = [];
                blocksToRead.forEach(blockNum => {
                    readqueue.push({blockNum:blockNum, callback:function (err, data) {
                        if (blockNum % 500 == 0)
                            console.log("Blocks left to read: " + (blockNum_to - blockNum));

                        if(err){
                            console.log(err);
                            return;
                        }

                        var comments = data.map(d=>d.op).filter(op=>op[0] == "comment")
                            .map(op=>{ 
                                op[1].timestamp = data[0].timestamp; 
                                return op[1]; 
                            });

                        var posts = comments.filter(p=>!p.parent_author);

                        for (var i in posts)
                            if(filter(posts[i]))
                                results.push(posts[i]);

                        if(blockNum === blocksToRead[blocksToRead.length-1])
                            callback(results);
                    }});
                });
            });
        });
    });
}

var stepReducer = 3;
function findFirstBlockAfterDate(lastBlock, step, tolerance, fromDate, callback) {
    step = step == null? -20000 : step;
    tolerance = tolerance || 60 * 1000; // default to 1 minute if not specified
    
    var diffFromNow = ((fromDate - new Date())/60/60/1000).toFixed(1) + " hours";

    readheaderqueue.push({
        blockNum: lastBlock + step,
        callback: function(err, headers) {
            if(err){
                console.log(err);
                return;
            }

            var blockDate = new Date(headers.timestamp);
            var diff = blockDate - fromDate;

            // console.log(
            //     "Searching for block from " + diffFromNow + 
            //     "\tChecking #" + (lastBlock + step) + " [" + pad(step, 7) + " ] " +
            //     " Diff : " + ((diff/1000/60).toFixed(1)) + "\tmin." );

            if(0 < diff && diff < tolerance) {
                //If we are lucky and find a block with the exact time
                callback(lastBlock + step, headers);
            }
            else if(step < stepReducer && step > 0  && blockDate > fromDate) {
                //If we are sure that the block is one of the first ones after the given time
                callback(lastBlock + step, headers);
            }
            else if(blockDate > fromDate && step > 0) {
                // change direction, go backward, but times slower
                findFirstBlockAfterDate(lastBlock + step, ((-step/stepReducer)|0)-1, tolerance, fromDate, callback);
            }
            else if(blockDate < fromDate && step < 0) {
                // change direction, go forward, but times slower
                findFirstBlockAfterDate(lastBlock + step, ((-step/stepReducer)|0)+1, tolerance, fromDate, callback);
            }
            else {
                // continue in same direction
                findFirstBlockAfterDate(lastBlock + step, step, tolerance, fromDate, callback);
            }
        }
    });
}

function pad(n, width, z) {
    z = z || ' ';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function setLastParsedBlockNumber(lastParsedBlock) {
    var text = JSON.stringify({number : lastParsedBlock});
    fs.writeFileSync(LAST_PARSED_BLOCK_PATH, text);
}