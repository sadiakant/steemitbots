
var steem = require("steem");
steem.api.setOptions({ url: 'https://api.steemit.com' });

var steemBlockTracker  = require("./steemBlockTracker");

try {
    console.log('1');
    return;
} finally {
    console.log('2');
}