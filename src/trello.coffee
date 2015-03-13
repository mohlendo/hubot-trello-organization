# Description:
#   Manage your Trello Board from Hubot!
#
# Dependencies:
#   "node-trello": "latest"
#
# Configuration:
#   HUBOT_TRELLO_KEY - Trello application key
#   HUBOT_TRELLO_TOKEN - Trello API token
#   HUBOT_TRELLO_BOARD - The ID of the Trello board you will be working with
#
# Commands:
#   hubot trello new "<list>" <name> - Create a new Trello card in the list
#   hubot trello list "<list>" - Show cards on list
#   hubot trello move <shortLink> "<list>" - Move a card to a different list
#
#
# Author:
#   jared barboza <jared.m.barboza@gmail.com>

board = {}
lists = {}

Trello = require 'node-trello'

trello = new Trello process.env.HUBOT_TRELLO_KEY, process.env.HUBOT_TRELLO_TOKEN

# verify that all the environment vars are available
ensureConfig = (out) ->
  out "Error: Trello app key is not specified" if not process.env.HUBOT_TRELLO_KEY
  out "Error: Trello token is not specified" if not process.env.HUBOT_TRELLO_TOKEN
  out "Error: Trello organization ID is not specified" if not process.env.HUBOT_TRELLO_ORGANIZATION
  return false unless (process.env.HUBOT_TRELLO_KEY and process.env.HUBOT_TRELLO_TOKEN and process.env.HUBOT_TRELLO_ORGANIZATION)
  true

##############################
# API Methods
##############################

showBoards = (msg) ->
  msg.reply "Sure thing boss. I'll list the boards for you."
  ensureConfig msg.send
  trello.get "/1/organizations/#{process.env.HUBOT_TRELLO_ORGANIZATION}/boards", (err, data) ->
    msg.reply "There was an error reading the list of boards" if err
    msg.send "* #{board.id} - #{board.name}" for board in data unless err and data.length == 0

showLists = (msg) ->
  msg.reply "Looking up the lists for #{msg.envelope.room}, one sec."
  ensureConfig msg.send
  trello.get "/1/organizations/#{process.env.HUBOT_TRELLO_ORGANIZATION}/boards", (err, data) ->
    msg.reply "There was an error reading the list of boards" if err
    found_board = false
    for board in data
      if board.name.toLowerCase() == msg.envelope.room.toLowerCase()
        found_board = true
        msg.reply "I've found the board #{board.name}. Now looking for the list..."
        trello.get "/1/boards/#{board.id}/lists", (err, data) ->
          msg.reply "There was an error reading the lists" if err
          msg.send "* #{list.name}" for list in data unless err and data.length == 0
        break
    if found_board == false
      msg.reply "I couldn't find a board named: #{msg.envelope.room}."

createCard = (msg, list_name, cardName) ->
  msg.reply "Sure thing boss. I'll create that card for you."
  ensureConfig msg.send
  trello.get "/1/organizations/#{process.env.HUBOT_TRELLO_ORGANIZATION}/boards", (err, data) ->
    msg.reply "There was an error reading the list of boards" if err
    for board in data
      if board.name.toLowerCase() == msg.envelope.room.toLowerCase()
        msg.reply "I've found the board #{board.name}. Now looking for the list..."
        trello.get "/1/boards/#{board.id}/lists", (err, data) ->
          msg.reply "There was an error reading the lists" if err
          for list in data
            found_list = false
            if list.name.toLowerCase() == list_name.toLowerCase()
              found_list = true
              trello.post "/1/cards", {name: cardName, idList: list.id}, (err, data) ->
                msg.reply "There was an error creating the card" if err
                msg.reply "OK, I created that card for you. You can see it here: #{data.url}" unless err
              break
          if found_list == false
            msg.reply "I couldn't find a list named: #{list_name}."
        break

showCards = (msg, list_name) ->
  msg.reply "Looking up the cards for #{list_name}, one sec."
  ensureConfig msg.send
  trello.get "/1/organizations/#{process.env.HUBOT_TRELLO_ORGANIZATION}/boards", (err, data) ->
    msg.reply "There was an error reading the list of boards" if err
    for board in data
      if board.name.toLowerCase() == msg.envelope.room.toLowerCase()
        msg.reply "I've found the board #{board.name}. Now looking for the list..."
        trello.get "/1/boards/#{board.id}/lists", (err, data) ->
          msg.reply "There was an error reading the lists" if err
          found_list = false
          for list in data
            if list.name.toLowerCase() == list_name.toLowerCase()
              found_list = true
              trello.get "/1/lists/#{list.id}", {cards: "open"}, (err, data) ->
                msg.reply "There was an error showing the list." if err
                msg.reply "Here are all the cards in #{data.name}:" unless err and data.cards.length == 0
                msg.send "* [#{card.shortLink}] #{card.name} - #{card.shortUrl}" for card in data.cards unless err and data.cards.length == 0
                msg.reply "No cards are currently in the #{data.name} list." if data.cards.length == 0 and !err
              break
          if not found_list
            msg.reply "I couldn't find a list named: #{list_name}."
        break

moveCard = (msg, card_id, list_name) ->
  ensureConfig msg.send
  trello.get "/1/organizations/#{process.env.HUBOT_TRELLO_ORGANIZATION}/boards", (err, data) ->
    msg.reply "There was an error reading the list of boards" if err
    for board in data
      if board.name.toLowerCase() == msg.envelope.room.toLowerCase()
        msg.reply "I've found the board #{board.name}. Now looking for the list..."
        trello.get "/1/boards/#{board.id}/lists", (err, data) ->
          msg.reply "There was an error reading the lists" if err
          found_list = false
          for list in data
            if list.name.toLowerCase() == list_name.toLowerCase()
              found_list = true
              trello.put "/1/cards/#{card_id}/idList", {value: list.id}, (err, data) ->
                msg.reply "Sorry boss, I couldn't move that card after all." if err
                msg.reply "Yep, ok, I moved that card to #{list_name}." unless err
            break;
          if found_list == false
            msg.reply "I couldn't find a list named: #{list_name}."
      break

module.exports = (robot) ->
  # fetch our board data when the script is loaded
  ensureConfig console.log

  robot.respond /trello new ["'](.+)["']\s(.*)/i, (msg) ->
    ensureConfig msg.send
    card_name = msg.match[2]
    list_name = msg.match[1]

    if card_name.length == 0
      msg.reply "You must give the card a name"
      return

    if list_name.length == 0
      msg.reply "You must give a list name"
      return
    return unless ensureConfig()

    createCard msg, list_name, card_name

  robot.respond /trello list ["'](.+)["']/i, (msg) ->
    showCards msg, msg.match[1]

  robot.respond /trello move (\w+) ["'](.+)["']/i, (msg) ->
    moveCard msg, msg.match[1], msg.match[2]

  robot.respond /trello list lists/i, (msg) ->
    msg.reply "Here are all the lists on your board."
    Object.keys(lists).forEach (key) ->
      msg.send " * " + key

  robot.respond /trello boards/i, (msg) ->
    showBoards msg

  robot.respond /trello lists/i, (msg) ->
    showLists msg

  robot.respond /trello help/i, (msg) ->
    msg.reply "Here are all the commands for me."
    msg.send " *  trello boards"
    msg.send " *  trello lists"
    msg.send " *  trello new \"<ListName>\" <TaskName>"
    msg.send " *  trello list \"<ListName>\""
    msg.send " *  shows * [<card.shortLink>] <card.name> - <card.shortUrl>"
    msg.send " *  trello move <card.shortlink> \"<ListName>\""
    msg.send " *  trello list lists"
