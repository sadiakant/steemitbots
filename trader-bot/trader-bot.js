var steem = require("steem");

var steemitWSS = "wss://steemd-int.steemit.com"
steem.api.setOptions({ url: steemitWSS });

var MINUTE = 60 * 1000;

///////////////////////////////

var user = initUser(require("./userData.json"));

///////////////////////////////

runTradeBot();
setInterval(function (params) { runTradeBot(); }, 30 * MINUTE);

///////////////////////////////

function runTradeBot() {
    steem.api.getFeedHistory(function (err, result) {
        var marketData = extractMarketData(result);

        steem.api.getOrderBook(1, function(err2, orders) {
            marketData.currentAsk = parseFloat(orders.asks[0].real_price);
            marketData.currentBid = parseFloat(orders.bids[0].real_price);

            marketData.current = (marketData.currentAsk + marketData.currentBid) / 2;

            log("---> Running trade bot. Current price: " + marketData.current);

            if(marketData.current > marketData.sell) {
                sell(marketData);
            }
            else if(marketData.current < marketData.buy) {
                buy(marketData);
            }
            else {
                log("It is not the time to act.");
            }
        });

    });
}

function extractMarketData(result) {

    var currentAvg = parseFloat(result.current_median_history.base.split(' ')[0]);

    var min = 9999999;
    var max = -1;
    var median = -1;
    var middle = -1;

    var prices = [];
    for (var i in result.price_history) {
        var sbdSring = result.price_history[i].base;
        var price = parseFloat(sbdSring.split(' ')[0]);
        prices.push(price);
    }

    prices.sort(function (a, b) { return a - b; });

    for (var i in prices) {
        var price = prices[i];

        if (min > price) min = price;
        if (max < price) max = price;
    }

    median = getMedian(prices);
    middle = (max + min) / 2;

    return {
        currentAvg: currentAvg,
        min: min,
        max: max,
        median: median,
        middle: middle,

        sell: ((max + median) / 2).toFixed(3),
        buy: ((min + median) / 2).toFixed(3)
    }
}

function getMedian(values) {
    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];
    else
        return (values[half - 1] + values[half]) / 2.0;
}

///////////////////////////////

function initUser(user) {
    user.wif = steem.auth.toWif(user.name, user.password, 'owner');

	if (user.wif == undefined)
		throw new Error("'wif' is undefined");

	return user;
}

///////////////////////////////

function sell(marketData) {
    steem.api.getAccounts([user.name], function(err, result) {
        var user = result[0];

        var sellBalance = parseFloat(user.balance.split(' ')[0]);

        if(sellBalance <= 0) {
            log("No money available - can't sell STEEM");
            return; 
        }

        var amountToSell = user.balance;
        var receive = (sellBalance * marketData.currentBid).toFixed(3);
        var minToReceive = receive + " SBD";

        marketData._Operation = "[SELL]"
        marketData.amountToSell = amountToSell;
        marketData.minToReceive = minToReceive;
        
        console.log(marketData);

        createOrder(amountToSell, minToReceive);
    });
}

function buy(marketData) {

    steem.api.getAccounts([user.name], function(err, result) {
        var user = result[0];

        var buyBalance = parseFloat(user.sbd_balance.split(' ')[0]);

        if (buyBalance <= 0) {
            log("No money available - can't buy STEEM");
            return;
        }

        var amountToSell = user.sbd_balance;
        var receive = (buyBalance / marketData.currentAsk).toFixed(3);
        var minToReceive = receive + " STEEM";

        marketData._Operation = "[BUY]"
        marketData.amountToSell = amountToSell;
        marketData.minToReceive = minToReceive;
        
        console.log(marketData);

        createOrder(amountToSell, minToReceive);
    });
}

function createOrder(amountToSell, minToReceive) {
    var orderid = (Math.random() * 999999) | 0;
    var fillOrKill = false;
    var expiration = "2030-01-12T12:26:03";

    log("Exchanging " + amountToSell + " for " + minToReceive);

    steem.broadcast.limitOrderCreate(
        user.wif, user.name, orderid, 
        amountToSell, minToReceive,
        fillOrKill, expiration, 
        function(err, result) {
            log(!err && result ? "Success" : err);
        });
}

///////////////////////////////

function log(line) {
    console.log(line);
}