# How to Start the bot:

 - Install NodeJS
 - Open your terminal/cmd, navigate to the bot folder and write [> `npm i`]
 - Fill `userData.json` with your username and owner password (in the specified JSON format)
 - Go to `lastHandledTransaction.json` and change the date to the moment you wish to start working from. Make sure to keep the formatting style of the date. The bot will only resteem based on transfers that occured after it.
 - Open your terminal/cmd, navigate to the bot folder and write [> `node bot.js`]


Alternatively, you can write a simple endless loop script that tries to restart the bot on failure.
    (failures occur if your internet connection breaks, or if the STEEM server is offline, as well as other problems)

# How to Stop the bot:

 - To stop the bot rename the `DontStop` file to something else (or simply delete it). That would make the bot stop reading the blokchain for new tasks
 - After the bot finishes it's pending tasks, you can safely turn it off.
 - When turning it back on, make sure a `DontStop` exists again.
