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

    // Updates the brain's  knowledge.
    function updateBrain(boards) {
        robot.brain.set('boards', boards);
    }

    // Returns all boards.
    function getBoards() {
        return robot.brain.get('boards') || {};
    }

    function saveBoard(room, board) {
        var boards = getBoards();
        boards[room] = board;
        updateBrain(boards);
    }

    function findBoard(msg, callback) {
        var boardName = findRoom(msg);
        var savedBoardName = getBoards()[boardName];
        if (savedBoardName) {
            boardName = savedBoardName;
        }
        msg.reply("Loading Board " + boardName);
        trello.get("/1/organizations/" + process.env.HUBOT_TRELLO_ORGANIZATION + "/boards", function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            console.log(data);
            var boards = data.filter(function (board) {
                return board.name.toLowerCase() === boardName.toLowerCase();
            });
            console.log(boards);
            if (boards && boards.length > 0) {
                callback(undefined, boards[0]);
            } else {
                msg.reply("I couldn't find a board named: " + boardName + ".");
                callback(undefined, undefined);
            }
        });
    }

    function findList(msg, board, listName, callback) {
        trello.get("/1/boards/" + board.id + "/lists", function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            var lists = data.filter(function (list) {
                return list.name.toLowerCase() === listName.toLowerCase();
            });
            if (lists && lists.length > 0) {
                callback(undefined, lists[0]);
            } else {
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
                msg.send("* " + board.name);
            });
        });
    });

    // list all the list of the current board.
    robot.respond(/list lists$/i, function (msg) {
        msg.reply("Looking up the lists, one sec.");
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

    // list all the cards in the given list of the current board
    robot.respond(/list cards in [\\"\\'](.+)[\\"\\']$/i, function (msg) {
        var listName = msg.match[1];
        msg.reply("Looking up the cards in list" + list + ", one sec.");
        ensureConfig(msg.send);
        findBoard(msg, function (err, board) {
            if (err) {
                msg.reply("Sorry, but there was an error reading the list of boards.");
                return;
            }
            if (board) {
                findList(msg, board, listName, function (err, list) {
                    if (err) {
                        msg.reply("Sorry, but there was an error reading the lists.");
                        return;
                    }
                    if (list) {
                        trello.get("/1/lists/" + list.id, {cards: "open"}, function (err, data) {
                            if (err) {
                                msg.reply("Sorry, but there was an error showing the cards.");
                                return;
                            }
                            if (data.cards.length > 0) {
                                msg.reply("Here are all the cards in " + data.name + ":");
                                data.cards.forEach(function (card) {
                                    msg.send("* [" + card.shortLink + "] #" + card.name + " - " + card.shortUrl);
                                });
                            } else {
                                msg.reply("No cards are currently in the " + data.name + " list.");
                            }
                        });
                    } else {
                        msg.reply("I couldn't find a list named: " + listName + ".");
                    }
                });
            }
        });
    });

    robot.respond(/create new [\\"\\'](.+)[\\"\\'] in [\\"\\'](.+)[\\"\\']$/i, function (msg) {
        var cardName = msg.match[1];
        var listName = msg.match[2];

        msg.reply("Sure thing boss. I'll create that card for you.");
        ensureConfig(msg.send);
        findBoard(msg, function (err, board) {
            if (err) {
                msg.reply("Sorry, but there was an error reading the list of boards.");
                return;
            }
            if (board) {
                findList(msg, board, listName, function (err, list) {
                    if (err) {
                        msg.reply("Sorry, but there was an error reading the lists.");
                        return;
                    }
                    if (list) {
                        trello.post("/1/cards", {name: cardName, idList: list.id}, function (err, data) {
                            if (err) {
                                msg.reply("There was an error creating the card");
                                return;
                            }
                            msg.reply("OK, I created that card for you. You can see it here: " + data.url);
                        });
                    } else {
                        msg.reply("I couldn't find a list named: " + listName + ".");
                    }
                });
            }
        });
    });

    robot.respond(/move (\w+) to [\\"\\'](.+)[\\"\\']$/i, function (msg) {
        var cardId = msg.match[1];
        var listName = msg.match[2];

        msg.reply("Sure thing boss. I'll move that card for you.");
        ensureConfig(msg.send);
        findBoard(msg, function (err, board) {
            if (err) {
                msg.reply("Sorry, but there was an error reading the list of boards.");
                return;
            }
            if (board) {
                findList(msg, board, listName, function (err, list) {
                    if (err) {
                        msg.reply("Sorry, but there was an error reading the lists.");
                        return;
                    }
                    if (list) {
                        trello.put("/1/cards/"+cardId+"/idList", {value: list.id}, function (err, data) {
                            if (err) {
                                msg.reply("Sorry boss, I couldn't move that card after all.");
                                return;
                            }
                            msg.reply("Yep, ok, I moved that card to " + listName + ".");
                        });
                    } else {
                        msg.reply("I couldn't find a list named: " + listName + ".");
                    }
                });
            }
        });
    });

    robot.respond(/set board to [\\"\\'](.+)[\\"\\']$/i, function (msg) {
        ensureConfig(msg.send);
        var room = findRoom(msg);
        var boardName = msg.match[1];
        saveBoard(room, boardName);
        msg.send("Ok, from now on this room is combined to the trello board: " + boardName);
    });
};
