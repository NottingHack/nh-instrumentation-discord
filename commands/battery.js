const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

module.exports = function () {
    this.battery = {};

    this.onMqttMessage = (topic, message) => {
	if (!topic.startsWith('nh/llap/messagebridge/listen')) return;

	const payload = JSON.parse(message.toString());
	if (payload.type != 'WirelessMessage') return;
	if (payload.data[0].startsWith('BATT')) {
	    const battery = payload.data[0].replace('BATT', '') + 'v';
	    var id = payload.id;

	    if (conf.wirelessMap.hasOwnProperty(id))
		id = conf.wirelessMap[id];

	    this.battery[id] = battery;
	}
    };

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!battery")) return;

	var battEmbed = new EmbedBuilder()
	    .setTitle("LLAP Battery Voltages")
	    .setDescription("Here is a report of the LLAP instrumentation battery voltages.");

	for (const [k, v] of Object.entries(this.battery)) {
	    battEmbed.addFields(
		{ name: k, value: v, inline: true}
	    )
	};

	message.reply({ embeds: [ battEmbed ]});
	message.react('🔋');
    };

};
