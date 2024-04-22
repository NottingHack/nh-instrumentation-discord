const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

module.exports = function () {
    this.discordClient = null;

    this.onMqttMessage = (topic, message) => {
	if (!topic.startsWith('nh/gk/DoorButton')) return;

	this.discordClient
	    .channels.fetch(conf.notificationChannel)
	    .then(channel => {
		channel.send({
		    content: `🔔 Doorbell ${message}`,
		    flags: [ 4096 ] // silenced
		});
	    });

	this.mqttClient.publish(
	    'pocsag/send',
	    `307040|NH Doorbell ${message}`
	);
    };

    this.onDiscordMessage = (message) => {

    };

};
