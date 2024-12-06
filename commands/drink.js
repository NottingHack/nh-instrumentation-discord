const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

module.exports = function () {
    this.onMqttMessage = (topic, message) => {

    };

    this.onDiscordMessage = (message) => {
	if (!message.content.toLowerCase().includes("node")) return;
	message.react('🍺');
    };
};
