const { EmbedBuilder } = require('discord.js');

module.exports = function () {
    this.mqttClient = null;

    this.onMqttMessage = (topic, message) => {};

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!display ")) return;

	const displayText = message.content.replace("!display ", "");
	this.mqttClient.publish("nh/mb/tx", displayText);

	message.react('✅');
    };

};
