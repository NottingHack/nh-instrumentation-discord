const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const conf = require('../config.json');

const {CategoryScale, Chart, LinearScale, LineController, LineElement, PointElement} = require('chart.js');
const {Canvas} = require('skia-canvas');
const fsp = require('node:fs/promises');

module.exports = function () {
    this.onMqttMessage = (topic, message) => {
    };

    this.onDiscordMessage = async (message) => {
	if (!message.content.startsWith('!humidity')) return;

	Chart.register([
	    CategoryScale,
	    LineController,
	    LineElement,
	    LinearScale,
	    PointElement
	]);

	const startDate = (Date.now()/1000) - (60*60*24);
	const endDate = (Date.now()/1000);
	const query = 'avg_over_time(hms_instrumentation_humidity[30m])';

	await fetch(`${conf.prometheusApi}/query_range?query=${query}&start=${startDate}&end=${endDate}&step=1000`)
	    .then(res => {
		return res.json();
	    })
	    .then(async res => {
		let humid = {};

		for (const result of res.data.result) {
		    humid[result.metric.sensor] = Number(result.values[result.values.length - 1][1]);
		}

		const values = Object.values(humid);
		if (values.length == 0) return; // we're not ready

		const mean = (values.reduce((acc, cur) => acc + cur) / values.length).toFixed(2);

		var tempEmbed = new EmbedBuilder()
		    .setTitle("Humidity")
		    .setDescription(`The average relative humidity is ${mean} %.`);

		for (const [k, v] of Object.entries(humid)) {
		    tempEmbed.addFields(
			{ name: k, value: v.toFixed(2) + ' %', inline: true}
		    );
		};

		const canvas = new Canvas(600, 300);
		let chartdef =  {
		    type: 'line',
		    data: {
			datasets: []
		    }
		};

		let colorIdx = 0;
		for (const result of res.data.result) {
		    chartdef.data.datasets.push({
			label: result.metric.sensor,
			data: result.values.map(e => Number(e[1])),
			pointRadius: 0,
			borderColor: conf.colours[colorIdx]
		    });
		    colorIdx++;
		    console.log(chartdef.data.datasets);
		    if (typeof chartdef.data.labels == 'undefined') {
			chartdef.data.labels = result.values.map(e => (new Date(Number(e[0])*1000).toLocaleString().split(', ')[1]));
		    }
		}
		let chart = new Chart(
		    canvas,
		    chartdef
		);
		const pngBuffer = await canvas.toBuffer('png', {matte: 'white'});
		await fsp.writeFile('humid.png', pngBuffer);
		chart.destroy();

		tempEmbed.setImage('attachment://humid.png');
		const file = new AttachmentBuilder('humid.png');

		message.reply({ embeds: [ tempEmbed ], files: [file]});
		message.react('💦');

	    });
    }
};
