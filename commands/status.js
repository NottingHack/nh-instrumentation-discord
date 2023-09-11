const { EmbedBuilder } = require('discord.js');

module.exports = function () {
    this.services = [];

    this.onMqttMessage = (topic, message) => {
	if (! topic.startsWith('nh/status/res')) return;

	const status = message.toString().split(': ')[0];
	const service = message.toString().split(': ')[1];
	this.services[service] = {
	    status: status,
	    time: Math.floor(Date.now() / 1000)
	};
    };

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!status")) return;

	var statusEmbed = new EmbedBuilder()
	    .setTitle("Service Status");

	const now = Math.floor(Date.now() / 1000);
	var count = 0;
	for (const [k, v] of Object.entries(this.services)) {
	    if (count++ >= 25) break;

	    var status = '💀';

	    if (v.time > now - 60)
		status = '😁';

	    statusEmbed.addFields(
		{ name: k, value: status, inline: true}
	    )
	};

	message.reply({ embeds: [ statusEmbed ]});
	message.react('💀');

    };

};
