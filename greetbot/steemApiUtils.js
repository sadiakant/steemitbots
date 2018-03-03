var steem = require("steem");

module.exports = {
    getRootPost:getRootPost,
    getAllCommentsOfPost: getAllCommentsOfPost,
}

/**
 * Gets the post data of the root post of the given commentData
 */
function getRootPost(commentData, callback) {
    var isRoot = !commentData.parent_author;
    var isParsedCommand = !commentData.body;

    if (isRoot) {
        if (!isParsedCommand)
            callback(commentData); //callback expects raw post data
        else
            steem.api.getContent.call({ callback: callback },
                commentData.author,
                commentData.permlink,
                function (err, comment) {
                    callback(comment);
                });

        return;
    }

    steem.api.getContent.call({ callback: callback },
        commentData.parent_author,
        commentData.parent_permlink,
        function (err, parent) {
            getRootPost(parent, callback);
        });
}

function getAllCommentsOfPost(post, callback) {
    steem.api.getContentReplies(post.author, post.permlink, function (err, rootReplies) {

        var counter = 0;
        var allComments = [];

        if (rootReplies.length == 0)
            callback(allComments);

        for (var i in rootReplies) {
            allComments.push(rootReplies[i])
            getAllCommentsOfPost(rootReplies[i], function (subReplies) {
                counter++;
                for (var y in subReplies)
                    allComments.push(subReplies[y]);

                if (counter >= rootReplies.length) {
                    callback(allComments);
                }
            });
        }
    });
}