const { EmbedBuilder } = require('discord.js');

module.exports = function () {
    this.temperature = {};

    this.onMqttMessage = (topic, message) => {
	if (!topic.startsWith('nh/temperature/')) return;

	const room = topic.split('/').pop()
	this.temperature[room] = parseFloat(message.toString());
    };

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith('!temp')) return;

	const values = Object.values(this.temperature);
	if (values.length == 0) return; // we're not ready

	const mean = (values.reduce((acc, cur) => acc + cur) / values.length).toFixed(2);

	var tempEmbed = new EmbedBuilder()
	    .setTitle("Temperature")
	    .setDescription(`The average temperature is ${mean} °c.`);

	for (const [k, v] of Object.entries(this.temperature)) {
	    tempEmbed.addFields(
		{ name: k, value: v + ' °c', inline: true}
	    );
	};

	message.reply({ embeds: [ tempEmbed ]});

	if (mean > 25)
	    message.react('🥵');
	else if (mean > 20)
	    message.react('😅');
	else if (mean > 15)
	    message.react('😊');
	else if (mean > 5)
	    message.react('🫤');
	else
	    message.react('🥶');
    };

};
