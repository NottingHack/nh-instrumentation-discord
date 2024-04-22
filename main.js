const { Client, Events, GatewayIntentBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const conf = require('./config.json');

const mqtt = require('mqtt')
const mqttClient = mqtt.connect(conf.mqtt)

var BOT_USER_ID;

var commands = [];

// Create a new client instance
const discordClient = new Client({
    intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.DirectMessages,
	GatewayIntentBits.GuildPresences,
    ],
});

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
discordClient.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    BOT_USER_ID = c.user.id
});

discordClient.on(Events.MessageCreate, function(message)  {
    if (message.author.id == BOT_USER_ID) return;

    commands.forEach(command => {
	command.onDiscordMessage(message);
    });
});

discordClient.on(Events.PresenceUpdate, function(before, after) {
    if (! after.user) return;
    if (after.user.id == BOT_USER_ID) return;

    commands.forEach(command => {
	if (! command.hasOwnProperty('onPresenceUpdate')) return;
	command.onPresenceUpdate(before, after);
    });
});


mqttClient.on('connect', function () {
    console.log("MQTT connected");

    conf.mqttSubscriptions.forEach(topic => {
	mqttClient.subscribe(topic, e => {
	    if (!e) return;
	    console.log(`failed to subscribe to ${topic}`);
	});
    });

    commands.forEach(command => {
	command.discordClient = discordClient;
	command.mqttClient = mqttClient;
    });
})

mqttClient.on('message', function (topic, message) {
    commands.forEach(command => {
	command.onMqttMessage(topic, message);
    });
});

// load commands
var normalizedPath = require("path").join(__dirname, "commands");

require("fs").readdirSync(normalizedPath).forEach(function(file) {
    const cmd = require("./commands/" + file);
    commands.push(new cmd());
});

// Log in to Discord with your client's token
discordClient.login(conf.token);
