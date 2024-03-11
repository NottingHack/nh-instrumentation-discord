const { EmbedBuilder } = require('discord.js');
const util = require('util');

module.exports = function () {
    this.departures = [];

    this.onMqttMessage = (topic, message) => {
	if (! topic.startsWith('nh/tdb/')) return;
	this.departures = JSON.parse(message);

	let board = "";
	this.departures.forEach(row => {
	    board += row.std.padEnd(6);
	    board += row.destination.padEnd(32);
	    board += row.platform.padEnd(4);
	    board += row.etd;
	    board += "\n";
	});

    };

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!trains")) return;

	let board = "**Departures from Nottingham Railway Station**\n";
	board += "```\n";
	this.departures.forEach(row => {
	    board += row.std.padEnd(6);
	    board += row.destination.padEnd(32).substring(0, 31);
	    board += row.platform.padEnd(4);
	    board += row.etd.padEnd(6);
	    board += "\n";
	});
	if (this.departures.length == 0) {
	    board += "No trains pending departure :'(";
	}
	board += "```";

	message.reply(board)
	    .catch(err => {
		this.mqttClient.publish('nh/discord/error', err);
	    });
	message.react('🚆');
    };

};
