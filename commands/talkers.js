const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

module.exports = function () {
    this.discordClient = null;

    this.onMqttMessage = (topic, message) => {
	if (!topic.startsWith('nh/urchin/said') &&
	    !topic.startsWith('nh/donationbot/said')) return;

	const sender = topic.includes('donationbot') ? '🤖 Donationbot' : '🧒 Urchin';
	this.discordClient
	    .channels.fetch(conf.notificationChannel)
	    .then(channel => {
		channel.send({
		    content: `${sender}: ${message}`,
		    flags: [ 4096 ] // silenced
		});
	    });

    };

    this.onDiscordMessage = (message) => {

    };

};
