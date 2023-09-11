const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

module.exports = function () {
    this.discordClient = null;

    this.onMqttMessage = (topic, message) => {
	if (!topic.startsWith('nh/gk/DoorButton')) return;

	const channel = this.discordClient
	      .channels.cache.find(channel => channel.name === 'public');

	channel.send(`🔔 Doorbell ${message}`);
    };

    this.onDiscordMessage = (message) => {

    };

};
