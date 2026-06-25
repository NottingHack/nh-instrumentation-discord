const conf = require('../config.json');
const charts = require('../charts.js');

module.exports = function () {
    this.onMqttMessage = (topic, message) => {
    };

    this.onDiscordMessage = async (message) => {
	if (!message.content.startsWith('!co2')) return;

	const startDate = (Date.now()/1000) - (60*60*24);
	const endDate = (Date.now()/1000);
	const query = 'avg_over_time(air_quality{stat="CO2"}[1h])';

	await fetch(`${conf.prometheusApi}/query_range?query=${query}&start=${startDate}&end=${endDate}&step=1000`)
	    .then(res => {
		return res.json();
	    })
	    .then(async res => {
		const mean = await charts.timeseriesToEmbed(message, res, 'CO2', 'ppm', 'name');

		if (mean > 1300)
		    message.react('🤢');
		else if (mean > 1000)
		    message.react('🥱');
		else if (mean > 700)
		    message.react('😗');
		else
		    message.react('🙂');
	    })
	    .catch(e => {
		console.log(e);
		message.reply('Problem querying prometheus, sorry');
	    });
    }
};
