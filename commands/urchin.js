const { EmbedBuilder } = require('discord.js');

module.exports = function () {
    this.mqttClient = null;

    this.onMqttMessage = (topic, message) => {};

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!urchin ")) return;

	const cmd = message.content.replace("!urchin ", "");
	this.mqttClient.publish("nh/urchin/cmd", cmd);

	message.react('🏳️‍🌈');
    };
};
