var NEWEST_RESTEEMED_PATH = './newestResteemed.json';
var newestResteemed = require(NEWEST_RESTEEMED_PATH).newestResteemed;

//////////////

var fs = require('fs');
var sql = require('mssql');
var steem = require('steem');

var steemitWSS = "wss://steemd-int.steemit.com";
steem.api.setOptions({ url: steemitWSS });

var passwords = require("./passwords.json");
var loginData = {
    name: passwords.name,
    password : passwords.password,
    type: 'owner'
};
var botUser = initUser(loginData);

var config = {
    server:"sql.steemsql.com",
    database:"DBSteem",
    user:"steemit",
    password:"steemit",
    port:1433,
};

var sqlQuery = fs.readFileSync('./postfinder.sql').toString();

//every 24 hours get all posts and resteem them over the 24 hours
var getPostFrequency = 24 * 60 * 60 * 1000;

doWork();
setInterval(function () { doWork(); }, getPostFrequency);

setInterval(doActionToKeepConnectionOpen, 30 * 1000);


/////////////////////////////////////

function doWork() {
    try {
        getPosts(sql, config, sqlQuery, function(results){
            console.log("   ---------------------------------------------------- ");
            log("Found " + results.length + " posts");
            var restBetween = getPostFrequency / results.length;
            log("A post will be resteemed every " + (restBetween/1000/60) + " minutes");
            console.log("   ---------------------------------------------------- ");
            
            results.forEach(function(post, i) {
                setTimeout(function() {
                    var post = results[i];
                    requestResteem(post);
                }, restBetween * i);
            }, this);
        });
    } catch (error) {
        log(error);
    }
}

function requestResteem(post) {
    console.dir(">> " + post.fullURL);
    makeTransaction(botUser, "resteembot", 0.025, "STEEM", post.fullURL);
    saveNewestResteemed(post.created);
}

/////////////////////////////////////

function getPosts(sql, config, query, callback) {
    var conn = new sql.ConnectionPool(config);
    var req = new sql.Request(conn);

    conn.connect(function (err) {
        if(err)
            return log( err);

        req.query(query, function(err, data){
            if(err)
                return log( err);

            var arr = [];
            for (var i = 0; i < data.recordset.length; i++) {
                var p = data.recordset[i];
                if (p.created.toISOString() > newestResteemed) {
                    arr.push(p);
                }
            }

            callback(arr);
            conn.close();
        });
    });
}

//////////////////////////////////

function makeTransaction(ownUser, to, amount, currency, memo) {
	steem.broadcast.transfer(ownUser.wif, ownUser.name, to, amount + " " + currency, memo, function (err, result) {
		if (!err && result) {
			log( "Successfull transaction from " + ownUser.name + " of " + amount + " " + currency + " to '" + to + "'");
		} else {
			log( err.message);
		}
	});
}

function initUser(loginData) {
	log( "Logging in as @" + loginData.name + "...");

	var user = {
		wif: steem.auth.toWif(loginData.name, loginData.password, loginData.type),
		name: loginData.name
	};

	log( "Logged in!");

	if (user.wif == undefined)
		throw new Error("'wif' is undefined");

	return user;
}

function log(str) {
    console.log(new Date().toString(), str);
}

function saveNewestResteemed(date) {
    var dateStr = date.toISOString()
	fs.writeFile(NEWEST_RESTEEMED_PATH, JSON.stringify({newestResteemed:dateStr}), function (err) {
		if (err) {
			log(err);
		} else {
            newestResteemed = date;
			log(NEWEST_RESTEEMED_PATH + " changed to " + dateStr);
		}
	});
}

function doActionToKeepConnectionOpen() {
    steem.api.getDiscussionsByCreated({ limit: 1 }, function (e, posts) {
        if (e !== null) {
            log('   [refresh failed]');
        }
    });
}