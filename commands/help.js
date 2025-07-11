const { EmbedBuilder } = require('discord.js');

module.exports = function () {
    this.temperature = {};

    this.onMqttMessage = (topic, message) => {};

    this.onDiscordMessage = (message) => {
	if (message.content.startsWith("!help")) {
	    message.reply(`
Hello! I'm Nottinghack Bot. Here is a list of commands

- !temp - temperatures within the space
- !humidity - humidity within the space
- !vibration - view the wobbles
- !radiation - view the radiation within the space
- !tools - upcoming tool bookings
- !status - instrumentation status
- !trains - show a rail departures from Nottingham Railway station
`);
	}
    };

};
