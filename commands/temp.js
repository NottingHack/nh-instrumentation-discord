const conf = require('../config.json');
const charts = require('../charts.js');

module.exports = function () {
    this.onMqttMessage = (topic, message) => {
    };

    this.onDiscordMessage = async (message) => {
	if (!message.content.startsWith('!temp')) return;

	const startDate = (Date.now()/1000) - (60*60*24);
	const endDate = (Date.now()/1000);
	const query = 'avg_over_time(hms_instrumentation_temperature[30m])';

	await fetch(`${conf.prometheusApi}/query_range?query=${query}&start=${startDate}&end=${endDate}&step=1000`)
	    .then(res => {
		return res.json();
	    })
	    .then(async res => {
		const mean = await charts.timeseriesToEmbed(message, res, 'Temperature', '°c', 'sensor');

		if (mean > 25)
		    message.react('🥵');
		else if (mean > 20)
		    message.react('😅');
		else if (mean > 15)
		    message.react('😊');
		else if (mean > 5)
		    message.react('🫤');
		else
		    message.react('🥶');
	    })
	    .catch(e => {
		console.log(e);
		message.reply('Problem querying prometheus, sorry');
	    });
    }
};
