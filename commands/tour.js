const conf = require('../config.json');

module.exports = function () {
    this.onMqttMessage = (topic, message) => {
    };

    this.onDiscordMessage = async (message) => {
	if (!message.content.startsWith('!tour')) return;

	// Calculate the next tour date
	let findWednesday = new Date();
	while (findWednesday.getDay() != 3) {
	    findWednesday.setDate(findWednesday.getDate() + 1);
	}
	const eventDateString = `${findWednesday.toISOString().substring(0, 11)}19:00:00`;
	const eventName = `Nottingham Hackspace Tour (${eventDateString})`;

	const startDate = (Date.now()/1000) - 10;
	const endDate = (Date.now()/1000);
	const query = `last_over_time(eventbrite{property="attendees", event="${eventName}"}[24h])`;

	await fetch(`${conf.prometheusApi}/query_range?query=${query}&start=${startDate}&end=${endDate}&step=100`)
	    .then(res => {
		return res.json();
	    })
	    .then(async res => {
		if (res.data.result.length == 1) {
		    let attendees = res.data.result[0].values[0][1];
		    message.reply(`There are ${attendees} booked in for the tour on ${eventDateString}`);
		}
	    })
	    .catch(e => {
		console.log(e);
		message.reply('Problem querying prometheus, sorry');
	    });
    }
};




