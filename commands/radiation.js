const conf = require('../config.json');
const charts = require('../charts.js');

module.exports = function () {
    this.cpm = {};
    this.discordClient = null;

    this.onMqttMessage = (topic, message) => {
		if (!topic.startsWith('nh/radiation/')) return;

		const id = topic.replace('nh/radiation/', '');
		this.cpm[id] = {
		    cpm: message.toString(),
		    timestamp: new Date()
		};

		// If above 100cpm, alert Furry Radiological Response Unit
		if (Number(this.cpm[id].cpm) < 100) return;

	    // If there are other reports from the past 2 hours don't alert
		let twoHourAgo = new Date();
		twoHourAgo.setHours(now.getHours() - 2);
		let isOtherEntries = Object.entries(this.cpm)
		    .some(([_k, v]) => v.timestamp > twoHourAgo && v.cpm > 100);
		if(isOtherEntries) return; 


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
						    content: `☢️ Unusually high CPM detected in space ☢️ \r\nLast reading: ${this.cpm[id].cpm}\r\n` +
						        `🐾☢️ Alerting Furry Radiological Response Unit 🐾☢️: ${mentions}`,
						    flags: [4096] // silenced
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
