# How to Start the bot:

 - Install NodeJS
 - Open your terminal/cmd, navigate to the bot folder and write [> `npm i`]
 - Fill `userData.json` with your username, owner password (in the specified JSON format) and the desired tag
 - Go to `lastHandledTransaction.json` and change the date to the moment you wish to start working from. Make sure to keep the formatting style of the date. The bot will only resteem posts that occured after it.
 - Open your terminal/cmd, navigate to the bot folder and write [> `node bot.js`]


Alternatively, you can write a simple endless loop script that tries to restart the bot on failure.
    (failures occur if your internet connection breaks, or if the STEEM server is offline, as well as other problems)

