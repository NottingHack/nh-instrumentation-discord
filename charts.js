const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const conf = require('./config.json');

const {CategoryScale, Chart, LinearScale, LineController, LineElement, PointElement} = require('chart.js');
const {Canvas} = require('skia-canvas');
const fsp = require('node:fs/promises');

Chart.register([
    CategoryScale,
    LineController,
    LineElement,
    LinearScale,
    PointElement
]);

module.exports.timeseriesToEmbed = async (message, res, title, unit, prop) => {
    let series = {};

    for (const result of res.data.result) {
	series[result.metric[prop]] = Number(result.values[result.values.length - 1][1]);
    }

    const values = Object.values(series);
    if (values.length == 0) return; // we're not ready

    const mean = (values.reduce((acc, cur) => acc + cur) / values.length).toFixed(2);

    var tempEmbed = new EmbedBuilder()
	.setTitle(title)
	.setDescription(`The sensor average is ${mean} ${unit}.`);

    for (const [k, v] of Object.entries(series)) {
	tempEmbed.addFields(
	    { name: k, value: `${v.toFixed(2)} ${unit}`, inline: true}
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
	    label: result.metric[prop],
	    data: result.values.map(e => Number(e[1])),
	    pointRadius: 0,
	    borderColor: conf.colours[colorIdx],
	    borderWidth: 1
	});
	colorIdx++;
	if (typeof chartdef.data.labels == 'undefined') {
	    chartdef.data.labels = result.values.map(e => (new Date(Number(e[0])*1000).toLocaleString().split(', ')[1]));
	}
    }
    let chart = new Chart(
	canvas,
	chartdef
    );
    const pngBuffer = await canvas.toBuffer('png', {matte: 'white'});
    await fsp.writeFile('plot.png', pngBuffer);
    chart.destroy();

    tempEmbed.setImage('attachment://plot.png');
    const file = new AttachmentBuilder('plot.png');

    message.reply({ embeds: [ tempEmbed ], files: [file]});

    return mean;
};
