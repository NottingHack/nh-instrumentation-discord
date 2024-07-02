const { EmbedBuilder } = require('discord.js');
const util = require('util');

module.exports = function () {
    this.departures = [];

    this.onMqttMessage = (topic, message) => {
	if (! topic.startsWith('nh/tdb/')) return;
	try {
	    this.departures = JSON.parse(message)
	} catch (e) {
	    console.log(e);
	}
    };

    this.onDiscordMessage = (message) => {
	if (!message.content.startsWith("!trains")) return;

	let getBoard = () => {
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
	    } else {
		const time = new Date().toString()
		      .split(' ')[4].padStart(28).padEnd(48);
		board += "\n" + time;
	    }
	    board += "```";

	    return board;
	};

	message.reply(getBoard())
	    .then((response) => {
		// Refresh for...
		for (let timer = 1; timer <= 10; timer++) {
		    setTimeout((m) => {
			m.edit(getBoard());
		    }, timer * 1000, response);
		}
	    })
	    .catch(err => {
		this.mqttClient.publish('nh/discord/error', err);
	    });
	message.react('🚆');
    };

};
