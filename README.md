# nh-discord

nh-discord is a discord bot for Nottingham Hackspace. Feel free to add stuff!

## Local development

Requirements:
1. NodeJS
2. Docker

### 1. Create a dev bot and update the config

You need a discord `token`, `clientId` and `primaryGuild`. You can create your own bot here https://discord.com/developers/applications

* **Installation** 
  * Give it `application.commands` and `bot` scopes.
  * Give it Administrator permissions (it would be better to match the deployed bot's permissions, but for simplicity...)
* **OAuth2** 
  * Here you can find the client ID
* **Bot**
  * Enable `Privileged Gateway Intents`
  * On this page you can get the token with the `Reset Token` button

Finally, add your bot to your own private discord server, using the Discord Provided Link on the `Installation` page.

You can get the `primaryGuild` by right-clicking on your server in the discord server list and using `Copy Server ID`.

### 2. Start prerequisites 

* MQTT
  * `docker run -it -p 1883:1883 eclipse-mosquitto:latest mosquitto -c /mosquitto-no-auth.conf`

### 3. Start the bot 

You can override the config by passing secret values as environment variables:

```shell
  token=[your token] \
  clientId=[your dev bot clientId] \
  primaryGuild=[your private server ID] \
  notificationChannel=[some channel ID from your server] \
  node main.js
```

(if you create a script with this info called `run-dev.sh` and it will be ignored by git)

At this point the local bot will connect to the discord application you configured and function like a normal bot 
on your private server without needing any privileged access to the production deployment.

