const { EmbedBuilder } = require('discord.js');
const conf = require('../config.json');

module.exports = function () {
    this.onMqttMessage = (topic, message) => {
    };

    this.onDiscordMessage = async (message) => {
	if (!message.content.startsWith('!temp')) return;

	await fetch(`${conf.prometheusApi}/query?query=hms_instrumentation_temperature`)
	    .then(res => {
		return res.json();
	    })
	    .then(res => {
		let temperature = {};

		for (const result of res.data.result) {
		    temperature[result.metric.sensor] = Number(result.value[1]);
		}

		const values = Object.values(temperature);
		if (values.length == 0) return; // we're not ready

		const mean = (values.reduce((acc, cur) => acc + cur) / values.length).toFixed(2);

		var tempEmbed = new EmbedBuilder()
		    .setTitle("Temperature")
		    .setDescription(`The average temperature is ${mean} °c.`);

		for (const [k, v] of Object.entries(temperature)) {
		    tempEmbed.addFields(
			{ name: k, value: v.toFixed(2) + ' °c', inline: true}
		    );
		};

		message.reply({ embeds: [ tempEmbed ]});

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
	    });


    };

};
