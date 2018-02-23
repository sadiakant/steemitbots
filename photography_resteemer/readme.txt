READ ME

--------------

Starting the bot :

- ensure NodeJS is installed
- open userData.json and write the name and private key of the bot
- to run the program:
	- on mac - double click "START.SH"
	- manually - write "npm start" in the terminal/cmd

----------------

Changing the configuration :

DO NOT change the configuration while the bot is running!
To change the configuration, stop the bot, edit "userData.json" and start the bot again.

----------------

Re-installing :

You can't simply install and run the program for a second time.
If you have to install again, on the same, or on different computer,
you have to grab the "lastHandledTransaction.json" file from the old instalation
and put it in the new one.

If for some reason you can no longer get that file (for example, if youe PC goes on fire)
write your own "lastHandledTransaction.json" file, with content:
	{ "value": "<a datetime when the bot was last working>" }
example:
	{ "value": "2018-02-04T09:49:30.000Z" }

----------------

Running with stability :

There are 2 ways to run stable, without need for a lot of maintanance.
	1 - pay for a clould VM and run there, using the START script
	2 - run on a computer that restarts itself on power loss (for example a raspberry py), using the START script
