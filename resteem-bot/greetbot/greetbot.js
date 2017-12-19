function runGreetBot(steem, onFoundPost) {

    var NEWEST_RESTEEMED_PATH = './newestResteemed.json';
    var newestResteemed = require(NEWEST_RESTEEMED_PATH).newestResteemed;

    //////////////

    var fs = require('fs');
    var sql = require('mssql');

    var passwords = require("./passwords.json");
    var loginData = {
        name: passwords.name,
        password: passwords.password,
        type: 'owner'
    };
    var botUser = initUser(loginData);

    var config = {
        server: "sql.steemsql.com",
        database: "DBSteem",
        user: "steemit",
        password: "steemit",
        port: 1433,
    };

    var sqlQuery = fs.readFileSync('./greetbot/postfinder.sql').toString();

    //every 24 hours get all posts and resteem them over the 24 hours
    var getPostFrequency = 24 * 60 * 60 * 1000;

    run();
    function run() {
        doWork(function continueWith(workResult){
            if (!workResult)
                // if no posts found, or no value returned (error), retry in 10 minutes.
                setTimeout(function () { run(); }, 10 * 60 * 1000);
            else
                // if work initiated, repeat after [getPostFrequency]
                setTimeout(function () { run(); }, getPostFrequency);
        });
    }

    /////////////////////////////////////

    function doWork(continueWith) {
        try {
            getPosts(sql, config, sqlQuery, function (results) {
                log("   ---------------------------------------------------- ");
                log("Found " + results.length + " posts");
                var restBetween = getPostFrequency / results.length;
                log("A post will be resteemed every " + (restBetween / 1000 / 60) + " minutes");
                log("   ---------------------------------------------------- ");

                if (results.length > 0) {
                    results.forEach(function (post, i) {
                        setTimeout(function () {
                            var post = results[i];
                            requestResteem(post);
                        }, restBetween * i);
                    }, this);
                    continueWith(true);
                }
                else continueWith(false);
            });
        } catch (error) {
            log(error);
            continueWith(false);
        }
    }

    function requestResteem(post) {
        log(">>> " + post.fullURL);

        try {
            onFoundPost(botUser, post);
        } catch (error) {
            log(error);
        }

        saveNewestResteemed(post.created);
    }

    /////////////////////////////////////

    function getPosts(sql, config, query, callback) {
        var conn = new sql.ConnectionPool(config);
        var req = new sql.Request(conn);

        conn.connect(function (err) {
            if (err)
                return log(err);

            req.query(query, function (err, data) {
                if (err)
                    return log(err);

                log("found " + data.recordset.length + " database records");

                var arr = [];

                var statistics = ['', {
                    length: "[length]",
                    occurances: "[occurances]",
                    englishSpeechRatio: "[englishSpeechRatio]",
                    isEnglish: "[isEnglish]",
                    fullURL: "[fullURL]"
                }];

                for (var i = 0; i < data.recordset.length; i++) {
                    var p = data.recordset[i];

                    if (p.created.toISOString() > newestResteemed) {
                        var englishTextScore = isTextInEnglish(p.body);
                        englishTextScore.fullURL = p.fullURL;
                        statistics.push(englishTextScore);

                        if (englishTextScore.isEnglish)
                            arr.push(p);
                    }
                }

                writeFile("./statistics.txt", statistics.reduce(function (prev, currnt, i, arr) {
                    return prev +
                        '\n' + currnt.length +
                        '\t' + currnt.occurances +
                        '\t' + currnt.englishSpeechRatio +
                        '\t' + currnt.isEnglish +
                        '\t' + currnt.fullURL;
                }));

                callback(arr);
                conn.close();
            });
        });
    }

    //////////////////////////////////


    function saveNewestResteemed(date) {
        var dateStr = date.toISOString()
        fs.writeFile(NEWEST_RESTEEMED_PATH, JSON.stringify({
            newestResteemed: dateStr
        }), function (err) {
            if (err) {
                log(err);
            } else {
                newestResteemed = date;
                log(NEWEST_RESTEEMED_PATH + " changed to " + dateStr);
            }
        });
    }

    function initUser(loginData) {
        log("Logging in as @" + loginData.name + "...");

        var user = {
            wif: steem.auth.toWif(loginData.name, loginData.password, loginData.type),
            name: loginData.name
        };

        log("Logged in!");

        if (user.wif == undefined)
            throw new Error("'wif' is undefined");

        return user;
    }

    function doActionToKeepConnectionOpen() {
        steem.api.getDiscussionsByCreated({
            limit: 1
        }, function (e, posts) {
            if (e !== null) {
                log('   [refresh failed]');
            }
        });
    }

    function writeFile(name, text) {
        fs.writeFile(name, text, function (err) {
            if (err) {
                log(err);
            } else {
                log("File " + name + " written to disk");
            }
        });
    }
}

function log(str) {
    console.log(new Date().toString(), "[ GREETBOT ]", str);
}

var regexEnglish = /[^\w]be[^\w]|[^\w]have[^\w]|[^\w]do[^\w]|[^\w]say[^\w]|[^\w]get[^\w]|[^\w]make[^\w]|[^\w]go[^\w]|[^\w]know[^\w]|[^\w]take[^\w]|[^\w]see[^\w]|[^\w]come[^\w]|[^\w]think[^\w]|[^\w]look[^\w]|[^\w]want[^\w]|[^\w]give[^\w]|[^\w]use[^\w]|[^\w]find[^\w]|[^\w]tell[^\w]|[^\w]ask[^\w]|[^\w]work[^\w]|[^\w]good[^\w]|[^\w]new[^\w]|[^\w]first[^\w]|[^\w]last[^\w]|[^\w]long[^\w]|[^\w]great[^\w]|[^\w]little[^\w]|[^\w]own[^\w]|[^\w]other[^\w]|[^\w]old[^\w]|[^\w]right[^\w]|[^\w]big[^\w]|[^\w]high[^\w]|[^\w]different[^\w]|[^\w]small[^\w]|[^\w]large[^\w]|[^\w]next[^\w]|[^\w]early[^\w]|[^\w]young[^\w]|[^\w]important[^\w]|[^\w]few[^\w]|[^\w]public[^\w]|[^\w]bad[^\w]|[^\w]same[^\w]|[^\w]able[^\w]|[^\w]seem[^\w]|[^\w]feel[^\w]|[^\w]try[^\w]|[^\w]leave[^\w]|[^\w]call[^\w]|[^\w]to[^\w]|[^\w]of[^\w]|[^\w]in[^\w]|[^\w]for[^\w]|[^\w]on[^\w]|[^\w]with[^\w]|[^\w]at[^\w]|[^\w]by[^\w]|[^\w]from[^\w]|[^\w]up[^\w]|[^\w]about[^\w]|[^\w]into[^\w]|[^\w]over[^\w]|[^\w]after[^\w]|[^\w]the[^\w]|[^\w]and[^\w]|[^\w]a[^\w]|[^\w]that[^\w]|[^\w]I[^\w]|[^\w]it[^\w]|[^\w]not[^\w]|[^\w]he[^\w]|[^\w]as[^\w]|[^\w]you[^\w]|[^\w]this[^\w]|[^\w]but[^\w]|[^\w]his[^\w]|[^\w]they[^\w]|[^\w]her[^\w]|[^\w]she[^\w]|[^\w]or[^\w]|[^\w]an[^\w]|[^\w]will[^\w]|[^\w]my[^\w]|[^\w]one[^\w]|[^\w]all[^\w]|[^\w]would[^\w]|[^\w]there[^\w]|[^\w]their[^\w]/g;

function isTextInEnglish(text) {
    var matches = text.match(regexEnglish);
    var occurances = matches ? matches.length : 0;
    var englishSpeechRatio = occurances / text.length;

    return {
        length: text.length,
        occurances: occurances,
        englishSpeechRatio: englishSpeechRatio,
        isEnglish: englishSpeechRatio > 0.03
    };
}

module.exports = {
    runGreetBot: runGreetBot,
    isTextInEnglish: isTextInEnglish
};