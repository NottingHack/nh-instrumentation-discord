const { Client, Events, GatewayIntentBits, Routes, REST } = require('discord.js');
const conf = require('./config.json');

// override any config keys given as environment variables
Object.keys(conf).forEach((key) => {
    if (process.env[key] != null) {
        conf[key] = process.env[key]
    }
})

const mqtt = require('mqtt')
const mqttClient = mqtt.connect(conf.mqtt)

var BOT_USER_ID;

var commands = [];
var slashCommands = []

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

/**
 * InteractionCreate is fired for various events:
 *   * Slash command is invoked
 *   * Button is pressed
 *   * Autocomplete
 *   * Modal is submitted
 *
 * Try and match the events up to a command.
 */
discordClient.on(Events.InteractionCreate, (interaction) => {
    // if the interaction is a button press get the command name from the interaction (todo: is there a better way?)
    try {
        const cmd = slashCommands.find((cmd) => cmd.accept(interaction.commandName ?? interaction.message?.interaction?.commandName));
        if (cmd) {
            if (interaction.isAutocomplete()) {
                cmd.autocomplete(interaction);
            } else if (interaction.isButton()) {
                cmd.handleButton(interaction);
            } else if (interaction.isCommand()) {
                cmd.execute(interaction);
            } else {
                console.warn("Unknown interaction type was ignored", interaction.type);
            }
        } else {
            console.error(`Failed to find command for interaction: ${interaction.commandName} (customId: ${interaction.customId})`);
        }
    } catch (err) {
        console.error(`Failed to handle interaction`, err);
    }
})

discordClient.on(Events.PresenceUpdate, function(before, after) {
    if (!after.user) return;
    if (after.user.id == BOT_USER_ID) return;

    commands.forEach(command => {
	if (! command.hasOwnProperty('onPresenceUpdate')) return;
	command.onPresenceUpdate(before, after);
    });
});

discordClient.on(Events.ThreadCreate, function(thread, isNewThread) {
    if (isNewThread)
	thread.join();
});

mqttClient.on('error', function (err) {
  console.error("failed to connect to MQTT", err)
})

mqttClient.on('connect', function () {
    console.log("MQTT connected");

    conf.mqttSubscriptions.forEach(topic => {
        mqttClient.subscribe(topic, e => {
            if (!e) return;
            console.log(`failed to subscribe to ${topic}`);
        });
    });

    commands.forEach(command => {
	    command.mqttClient = mqttClient;
    });
})

mqttClient.on('message', function (topic, message) {
    commands.forEach(command => {
	    command.onMqttMessage(topic, message);
    });
});

// load commands
var commandsPath = require("path").join(__dirname, "commands");

require("fs").readdirSync(commandsPath).forEach(function(file) {
    const cmd = require("./commands/" + file);
    const instance = new cmd()
    instance.discordClient = discordClient
    commands.push(instance);
});

var slashCommandsPath = require("path").join(__dirname, "slash_commands");

require("fs").readdirSync(slashCommandsPath).forEach(function(file) {
    const cmd = require("./slash_commands/" + file);
    const instance = new cmd()
    instance.discordClient = discordClient
    slashCommands.push(instance);
});


/**
 * Slash commands need to be added to the bot on start-up.
 */
const rest = new REST({ version: '10' }).setToken(conf.token);
(async () => {
    try {
        console.log('Started refreshing slash commands.');
        await rest.put(
            // Get the clientID from https://discord.com/developers/applications/[application]/oauth2
            Routes.applicationGuildCommands(conf.clientId, conf.primaryGuild),
            { body: slashCommands.map((cmd) => cmd.configure()) },
        );
        console.log('Successfully reloaded slash commands.');
    } catch (error) {
        console.error('Failed to setup slash commands', error);
    }
})().finally(() => {
    // Log in to Discord with your client's token
    discordClient.login(conf.token);
})


