// Description:
//   Manage the Trello Boards of your organisation from Hubot!
//
// Dependencies:
//   "node-trello": "latest"
//
// Configuration:
//   HUBOT_TRELLO_KEY - Trello application key
//   HUBOT_TRELLO_TOKEN - Trello API token
//   HUBOT_TRELLO_ORGANIZATION - The ID or name of the Trello organisation
//
// Commands:
//
//   hubot trello new "<list>" <name> - Create a new Trello card in the list
//   hubot trello list "<list>" - Show cards on list
//   hubot trello move <shortLink> "<list>" - Move a card to a different list
//
//
// Author:
//   Manuel Ohlendorf <m.ohlendorf@gmail.com

var Trello = require('node-trello');
var trello = new Trello(process.env.HUBOT_TRELLO_KEY, process.env.HUBOT_TRELLO_TOKEN)

module.exports = function (robot) {

    // verify that all the environment vars are available
    function ensureConfig(out) {
        if (!process.env.HUBOT_TRELLO_KEY) {
            out("Error: Trello app key is not specified");
        }
        if (!process.env.HUBOT_TRELLO_TOKEN) {
            out("Error: Trello token is not specified");
        }
        if (!process.env.HUBOT_TRELLO_ORGANIZATION) {
            out("Error: Trello organization ID is not specified");
        }
        return true || process.env.HUBOT_TRELLO_KEY && process.env.HUBOT_TRELLO_TOKEN && process.env.HUBOT_TRELLO_ORGANIZATION;
    }

    // Finds the room for most adaptors
    function findRoom(msg) {
        var room = msg.envelope.room;
        if (room == undefined) {
            room = msg.envelope.user.reply_to;
        }
        return room;
    }

    function findBoard(msg, callback) {
        var room = findRoom(msg);
        trello.get("/1/organizations/" + process.env.HUBOT_TRELLO_ORGANIZATION + "/boards", function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            var boards = data.some(function (board) {
                return board.name.toLowerCase() === room.toLowerCase();
            });
            if (boards && boards.length > 0) {
                callback(undefined, boards[0]);
            } else {
                msg.reply("I couldn't find a board named: " + room + ".");
                callback(undefined, undefined);
            }
        });
    }

    // check the config first
    ensureConfig(console.log);

    // lists all the boards of the organisation
    robot.respond(/list boards$/i, function (msg) {
        msg.reply("Sure thing boss. I'll list the boards for you.");
        ensureConfig(msg.send);

        trello.get("/1/organizations/" + process.env.HUBOT_TRELLO_ORGANIZATION + "/boards", function (err, data) {
            if (err) {
                msg.reply("Sorry, but there was an error reading the list of boards.");
                return;
            }
            data.forEach(function (board) {
                msg.send("* " + board.id + " - " + board.name);
            });
        });
    });

    // list all the list of the current board.
    robot.respond(/list lists$/i, function (msg) {
        var room = findRoom(msg);
        msg.reply("Looking up the lists for " + room + ", one sec.");
        ensureConfig(msg.send);
        findBoard(msg, function (err, board) {
            if (err) {
                msg.reply("Sorry, but there was an error reading the list of boards.");
                return;
            }
            if (board) {
                trello.get("/1/boards/" + board.id + "/lists", function (err, data) {
                    if (err) {
                        msg.reply("Sorry, but there was an error reading the lists.");
                        return;
                    }
                    data.forEach(function (list) {
                        msg.send("* " + list.name);
                    });
                });
            }
        });
    });
};
