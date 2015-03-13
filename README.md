hubot-trello-organization
============

Manage trello boards of your organization from hubot. This is heavily inspired by the original [hubot-trello](https://github.com/hubot-scripts/hubot-trello).
Hubot tries to find the correct board from the room name. You can also change the board connected to the room.


## Installation

Add **hubot-trello-organization** to your `package.json` file:

```json
"dependencies": {
  "hubot": ">= 2.5.1",
  "hubot-scripts": ">= 2.4.2",
  "hubot-trello-organization": "*"
}
```

OR run `npm install --save hubot-trello-organization`

Add **hubot-trello-organization** to your `external-scripts.json`:

```json
["hubot-trello-organization"]
```

Run `npm install`


## Configuration

```
HUBOT_TRELLO_KEY    - Trello application key
HUBOT_TRELLO_TOKEN  - Trello API token
HUBOT_TRELLO_ORGANIZATION  - The ID or name of the Trello organization you want to work with
```

- To get your key, go to: `https://trello.com/1/appKey/generate`
- To get your token, go to: `https://trello.com/1/authorize?key=<<your key>>&name=Hubot+Trello&expiration=never&response_type=token&scope=read,write`
