const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

module.exports = function () {
    this.humidity = {};

    this.onMqttMessage = (topic, message) => {
	if (!topic.startsWith('nh/llap/messagebridge/listen')) return;

	const payload = JSON.parse(message.toString());
	if (payload.type != 'WirelessMessage') return;
	if (payload.data[0].startsWith('RHUM')) {
	    const hum = payload.data[0].replace('RHUM', '') + '%';
	    var id = payload.id;

	    if (conf.wirelessMap.hasOwnProperty(id))
		id = conf.wirelessMap[id];

	    this.humidity[id] = hum;
	}
    };

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!humidity")) return;

	var humidEmbed = new EmbedBuilder()
	    .setTitle("Relative Humidity")
	    .setDescription("Here is a report of the humidity within the hackspace.");

	for (const [k, v] of Object.entries(this.humidity)) {
	    humidEmbed.addFields(
		{ name: k, value: v, inline: true}
	    )
	};

	message.reply({ embeds: [ humidEmbed ]});
	message.react('💦');
    };

};
