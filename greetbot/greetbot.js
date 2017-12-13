var fs = require('fs');
var sql = require('mssql');
var steem = require('steem');

var steemitWSS = "wss://steemd-int.steemit.com";
steem.api.setOptions({ url: steemitWSS });

// var connectionStr = "Driver={ODBC Driver 13 for SQL Server};" + 
//     "Server=sql.steemsql.com;" +
//     "Database=DBSteem;" +
//     "uid=steemit;" +
//     "pwd=steemi";
var connStr = 'mssql://steemit:steemit@sql.steemsql.com/DBSteem';

var config = {
    server:"sql.steemsql.com",
    database:"DBSteem",
    user:"steemit",
    password:"steemit",
    port:1433,
};

var botData = require("./passwords.json");
var sqlQuery = fs.readFileSync('./postfinder.sql').toString();

var getPostFrequency = 24 * 60 * 60 * 1000;

getPosts(sql, config, sqlQuery, function(results){
    for (var i in results) {
        if (results.hasOwnProperty(i)) {
            var element = results[i];
            console.log(results[i].fullURL);
        }
    }
});

/////////////////////////////////////

function getPosts(sql, config, query, callback) {
    var conn = new sql.ConnectionPool(config);
    var req = new sql.Request(conn);

    conn.connect(function (err) {
        if(err)
            return console.log(err);

        req.query(query, function(err, data){
            if(err)
                return console.log(err);
            callback(data.recordset);
            conn.close();
        });
    });
}

function makeTransaction(ownUser, to, amount, currency, memo) {
	steem.broadcast.transfer(ownUser.wif, ownUser.name, to, amount + " " + currency, memo, function (err, result) {
		if (!err && result) {
			log("Successfull transaction from " + ownUser.name + " of " + amount + " " + currency + " to '" + to + "'");
		} else {
			console.log(err.message);
		}
	});
}