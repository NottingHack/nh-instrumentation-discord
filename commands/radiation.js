const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

module.exports = function () {
    this.cpm = {};

    this.onMqttMessage = (topic, message) => {
	if (!topic.startsWith('nh/radiation/')) return;

	const id = topic.replace('nh/radiation/', '');
	this.cpm[id] = message;
    };

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!radiation")) return;

	var radiationEmbed = new EmbedBuilder()
	    .setTitle("Radiation")
	    .setDescription("Here are the last radiation CPM readings in the space.");

	for (const [k, v] of Object.entries(this.cpm)) {
	    radiationEmbed.addFields(
		{ name: k, value: v, inline: true}
	    )
	};

	message.reply({ embeds: [ radiationEmbed ]});
	message.react('☢️');
    };
};
