const conf = require('../config.json');
const charts = require('../charts.js');

module.exports = function () {
    this.discordClient = null;

    this.onMqttMessage = (topic, message) => {
	if (!topic.startsWith('nh/radiation/')) return;

	let cpm = {};

	const id = topic.replace('nh/radiation/', '');
	cpm[id] = message.toString();

	// If above 100cpm, alert Furry Radiological Response Unit
	if (Number(cpm[id]) < 100) return;

	const guild = this.discordClient
	      .guilds.cache.get(conf.primaryGuild);

	// Get user Ids of FRRU members
	guild.members.fetch()
	    .then(members => {
		const mentions = members.filter(member => conf.FRRUUsersnames.includes(member.user.username))
		      .map(v => `<@${member.user.id}>`).join(" ");
		if (!mentions) return;
		this.discordClient
		    .channels.fetch(conf.notificationChannel)
		    .then(channel => {
			channel.send({
			    content: `☢️ Unusually high CPM detected in space ☢️ \r\nLast reading: ${cpm[id]}\r\n` +
				`🐾☢️ Alerting Furry Radiological Response Unit 🐾☢️: ${mentions}`,
			    flags: [ 4096 ] // silenced
			});
		    });
	    });
    };

    this.onDiscordMessage = async (message) => {
	if (!message.content.startsWith('!radiation')) return;

	const startDate = (Date.now()/1000) - (60*60*24);
	const endDate = (Date.now()/1000);
	const query = 'avg_over_time(radiation[30m])';

	await fetch(`${conf.prometheusApi}/query_range?query=${query}&start=${startDate}&end=${endDate}&step=1000`)
	    .then(res => {
		return res.json();
	    })
	    .then(async res => {
		const mean = await charts.timeseriesToEmbed(message, res, 'Radiation', 'cpm', 'area');
		message.react('☢️');
	    })
	    .catch(e => {
		console.log(e);
		message.reply('Problem querying prometheus, sorry');
	    });
    }
};
