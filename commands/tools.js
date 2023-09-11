const { EmbedBuilder } = require('discord.js');

module.exports = function () {
    this.bookings = {};

    this.onMqttMessage = (topic, message) => {
	if (! topic.startsWith('nh/bookings/')) return;

	const tool = topic.split('/')[2]
	if (tool == 'poll') return;
	if (tool == 'Laser') return; // old laser
	const b = JSON.parse(message.toString());

	if (b.now.display_name != "none") {
	    this.bookings[tool] = `${b.now.display_name}`;
	    if (b.next.display_name != "none") {
		this.bookings[tool] += `, then ${b.next.display_name} at ${b.next.display_time}`;
	    }
	} else if (b.next.display_name != 'none') {
	    this.bookings[tool] = `${b.next.display_name} at ${b.next.display_time}`;
	} else {
	    this.bookings[tool] = 'free';
	}
    };

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!tools")) return;

	var toolEmbed = new EmbedBuilder()
	    .setTitle("Tool Bookings")
	    .setDescription("Here's an overview of upcoming tool bookings.");

	for (const [k, v] of Object.entries(this.bookings)) {
	    toolEmbed.addFields(
		{ name: k, value: v, inline: true}
	    )
	};

	message.reply({ embeds: [ toolEmbed ]});
	message.react('🔨');
    };

};
