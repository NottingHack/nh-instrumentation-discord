const conf = require('../config.json');
const charts = require('../charts.js');

module.exports = function () {
    this.onMqttMessage = (topic, message) => {
    };

    this.onDiscordMessage = async (message) => {
	if (!message.content.startsWith('!mph')) return;

	const startDate = (Date.now()/1000) - (60*60*24);
	const endDate = (Date.now()/1000);
	const query = 'sum(increase(discord_messages_count[1h]))';

	await fetch(`${conf.prometheusApi}/query_range?query=${query}&start=${startDate}&end=${endDate}&step=1000`)
	    .then(res => {
		return res.json();
	    })
	    .then(async res => {
		await charts.timeseriesToEmbed(message, res, 'Discord Message Per Hour (mph)', 'mph', 'Value');
	    })
	    .catch(e => {
		console.log(e);
		message.reply('Problem querying prometheus, sorry');
	    });
    }
};




