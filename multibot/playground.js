var steem = require("steem");
steem.api.setOptions({ url: 'https://api.steemit.com' });


steem.api.getState("/@haejin", function(err, data){
	console.log(err, data);
});