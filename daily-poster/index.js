//      https://icanhazdadjoke.com/
//      https://icanhazdadjoke.com/j/<joke_id>.png

const request = require("request");
const steem = require("steem");
const user = require("./userData.json");
user.wif = steem.auth.toWif(user.name, user.password, 'owner');

/////////////////// CONSTANTS /////////////////////////

const DAY = 24 * 60 * 60 * 1000;

const POST_AT = 18; // 18:00 local time

const TAGS = ["funny", "joke"];

const BODY_HEADER = "This bot brings a new joke every day.\nLet's see today's joke: \n\n";
const BODY_BEFORE_JOKE = ">";
const BODY_AFTER_JOKE = "\n\n";
const BODY_FOOTER = "This joke was taken from : https://icanhazdadjoke.com/";

/////////////////// INITIALIZER /////////////////////////

console.log("Bot scheduled to run at " + POST_AT + ":00 local time");
var toWait = getTimeTill(POST_AT);
reportTime()
setInterval(reportTime, DAY / 24); // hourly report

setTimeout(function () {
    run();
    setInterval(function () {
        run();
    }, DAY)
}, toWait);

/////////////////// FUNCTIONS /////////////////////////

function reportTime() {
    console.log("Time until the bot activates : " + (getTimeTill(POST_AT) / 1000) + " s.");
}

function run() {
    getJoke(function (err, joke) {
        if (err) {
            console.log("Error getting Joke : " + err.message);
            return;
        }

        var body =
            BODY_HEADER +
            BODY_BEFORE_JOKE +
            joke +
            BODY_AFTER_JOKE +
            BODY_FOOTER;

        var date = new Date().toISOString().split('T')[0];

        var permlink = createPost(user, "Daily Joke : " + date, body, TAGS);

        console.log("The bot will attempt to upvote itself in 21 minutes.")
        setTimeout(function () { vote(user, user.name, permlink) }, 21 * 60 * 1000);
    });
}

function run3() {
    console.log("getting joke 1...")
    getJoke(function (err1, joke1) {
        console.log(joke1);
        setTimeout(function(){
            console.log("getting joke 2...")
            getJoke(function (err2, joke2) {
                console.log(joke2);
                setTimeout(function () {
                    console.log("getting joke 3...")
                    getJoke(function (err3, joke3) {
                        console.log(joke3 + "\n");

                        var jokes = [joke1, joke2, joke3]
                            .filter(j => j != null);

                        if (jokes.length == 0) {
                            console.log("Failed to get at least 1 joke");
                            return;
                        }

                        var jokeText = jokes
                            .map(joke => BODY_BEFORE_JOKE + joke + BODY_AFTER_JOKE)
                            .join("");

                        var body = BODY_HEADER + jokeText + BODY_FOOTER;

                        var date = new Date().toISOString().split('T')[0];

                        var permlink = createPost(user, "Daily Joke : " + date, body, TAGS);

                        console.log("The bot will attempt to upvote itself in 21 minutes.")
                        setTimeout(function () { vote(user, user.name, permlink) }, 21 * 60 * 1000);
                    })
                }, 1000);
            })
        }, 1000);
    })
}

function getJoke(continueWith) {
    const op_GetDadJoke = {
        method: 'GET',
        url: 'https://icanhazdadjoke.com/',
        headers: { 'Accept': 'text/plain' }
    };
    request(op_GetDadJoke, function (err, res, body) {
        if (err) continueWith(err, null);
        else continueWith(null, body)
    });
}

function vote(ownUser, author, permlink) {
    votingPower = 10000;
    steem.broadcast.vote(ownUser.wif, ownUser.name, author, permlink, votingPower, function (err, voteResult) {
        if (!err && voteResult) {
            console.log(ownUser.name + " voted on : /" + author + "/" + permlink);
        } else {
            console.log('Voting failure (' + permlink + '): ' + err);
        }
    });
}

function createPost(ownUser, title, body, tags) {
    var firstTag = tags[0];
    tags = tags.slice(1, tags.length);
    permlink = title
        .toLowerCase()
        .replace(/[^a-z\- 0-9]/g, "")
        .trim()
        .replace(/ /g, "-")

    steem.broadcast.comment(
        ownUser.wif, '', firstTag, ownUser.name, permlink, title, body,
        { tags: tags, app: 'steemjs-joke-bot' },
        function (err, result) {
            if (err) console.log('Failed to post! ' + err);
            else console.log('Successful post!     ' + permlink);
        }
    );

    return permlink;
}

function getTimeTill(hour) {
    var d = new Date();
    d.setHours(hour);
    d.setMinutes(00);
    d.setSeconds(00);
    var ms = d - new Date();
    if (ms < 0)
        ms += DAY
    return ms;
}